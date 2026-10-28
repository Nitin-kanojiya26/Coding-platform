const mongoose = require('mongoose');
const Contest = require('../models/Contest');
const ContestParticipant = require('../models/ContestParticipant');
const ContestNotification = require('../models/ContestNotification');
const User = require('../models/Users');
const Problem = require('../models/Problem');
const BuildProblem = require('../models/BuildProblem');
const Submission = require('../models/Submission');
const BuildSubmission = require('../models/BuildSubmission');
const { computeContestStatus } = require('../utils/contestStatus');
const { generateJoinCode } = require('../utils/contestAlphabet');
const { scheduleContestLifecycleJobs, cancelContestLifecycleJobs } = require('../queues/contestLifecycleQueue');
const { executeProblemSelection } = require('../services/contestSelectionService');
const { getContestLeaderboard, getContestStats: fetchContestStats } = require('../services/contestLeaderboardService');

// Configurable Environment Limits with safe defaults
const getEnvLimits = () => ({
  maxActiveUserContests: Math.max(1, parseInt(process.env.MAX_ACTIVE_USER_CONTESTS, 10) || 3),
  maxQuestionsUser: Math.max(1, parseInt(process.env.CONTEST_MAX_QUESTIONS_USER, 10) || 8),
  maxQuestionsAdmin: Math.max(1, parseInt(process.env.CONTEST_MAX_QUESTIONS_ADMIN, 10) || 15),
  minDurationMinutes: Math.max(1, parseInt(process.env.CONTEST_MIN_DURATION_MIN, 10) || 20),
  maxDurationMinutes: Math.max(20, parseInt(process.env.CONTEST_MAX_DURATION_MIN, 10) || 240),
  defaultMaxParticipantsDSA: Math.max(1, parseInt(process.env.CONTEST_MAX_PARTICIPANTS_DSA, 10) || 50),
  defaultMaxParticipantsAPI: Math.max(1, parseInt(process.env.CONTEST_MAX_PARTICIPANTS_API, 10) || 20),
  defaultPenaltyMinutes: Math.max(0, parseInt(process.env.CONTEST_PENALTY_MINUTES, 10) || 20),
});

/**
 * Sanitize contest payload for client output:
 * - Hides problem statements/tests before contest starts.
 * - Hides joinCode from non-participants.
 * - Injects dynamic computed status and serverNow.
 */
function formatContestResponse(contestDoc, user = null, isParticipant = false) {
  const contest = contestDoc.toObject ? contestDoc.toObject() : { ...contestDoc };
  const now = new Date();
  const status = computeContestStatus(contest, now);
  contest.status = status;

  const isAdmin = user && user.role === 'admin';
  const isCreator = user && contest.createdBy && contest.createdBy.toString() === user._id.toString();

  // Hide joinCode from public view / non-participants
  if (contest.kind === 'private' && !isCreator && !isParticipant && !isAdmin) {
    delete contest.joinCode;
  }

  // Before start: Hide problem details from all non-admins
  if (status === 'scheduled' && !isAdmin) {
    if (Array.isArray(contest.problems)) {
      contest.problems = contest.problems.map((p) => ({
        label: p.label,
        points: p.points,
        problemModel: p.problemModel,
      }));
    }
  }

  return contest;
}

/**
 * POST /api/contests/public or /api/contests/publiccontest
 * Create a public contest (Admin only)
 */
exports.createPublicContest = async (req, res) => {
  req.body = req.body || {};
  req.body.kind = 'public';
  return exports.createContest(req, res);
};

/**
 * POST /api/contests/private or /api/contests/privatecontest
 * Create a private contest (User or Admin)
 */
exports.createPrivateContest = async (req, res) => {
  req.body = req.body || {};
  req.body.kind = 'private';
  return exports.createContest(req, res);
};

/**
 * POST /api/contests
 * Create a new contest
 */
exports.createContest = async (req, res) => {
  try {
    const limits = getEnvLimits();
    const isAdmin = req.user.role === 'admin';

    const {
      title,
      description,
      kind = 'private',
      type = 'dsa',
      scoring,
      startTime,
      durationMinutes,
      selection,
      problems,
      maxParticipants,
      allowLateJoin,
      penaltyMinutes,
    } = req.body;

    // 1. Kind & Admin permission check
    if (!['public', 'private'].includes(kind)) {
      return res.status(400).json({ message: 'Contest kind must be either "public" or "private".' });
    }
    if (kind === 'public' && !isAdmin) {
      return res.status(403).json({ message: 'Only administrators can create public contests.' });
    }

    // 2. Type validation
    if (!['dsa', 'api'].includes(type)) {
      return res.status(400).json({ message: 'Contest type must be either "dsa" or "api".' });
    }

    // 3. Scoring mode: default 'icpc' for dsa, 'points' for api
    const resolvedScoring = scoring || (type === 'dsa' ? 'icpc' : 'points');
    if (!['icpc', 'points'].includes(resolvedScoring)) {
      return res.status(400).json({ message: 'Scoring must be either "icpc" or "points".' });
    }

    // 4. Title validation
    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return res.status(400).json({ message: 'Title is required and must be at least 3 characters long.' });
    }
    if (title.trim().length > 120) {
      return res.status(400).json({ message: 'Title cannot exceed 120 characters.' });
    }

    // 5. Duration validation
    const duration = parseInt(durationMinutes, 10);
    if (isNaN(duration) || duration < limits.minDurationMinutes || duration > limits.maxDurationMinutes) {
      return res.status(400).json({
        message: `Duration must be between ${limits.minDurationMinutes} and ${limits.maxDurationMinutes} minutes.`,
      });
    }

    // 6. Start time validation
    if (!startTime) {
      return res.status(400).json({ message: 'Start time is required.' });
    }
    const start = new Date(startTime);
    if (isNaN(start.getTime())) {
      return res.status(400).json({ message: 'Invalid start time format.' });
    }

    const now = new Date();
    // Allow a 60-second leeway for "start now" creation
    const earliestAllowed = new Date(now.getTime() - 60 * 1000);
    if (start < earliestAllowed) {
      return res.status(400).json({ message: 'Start time cannot be in the past.' });
    }

    // User limit: within 7 days
    if (!isAdmin) {
      const maxFutureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      if (start > maxFutureDate) {
        return res.status(400).json({ message: 'Contest start time must be within 7 days from now.' });
      }
    }

    const end = new Date(start.getTime() + duration * 60000);

    // 7. Active contest limit for non-admin users
    if (!isAdmin) {
      const activeContestsCount = await Contest.countDocuments({
        createdBy: req.user._id,
        cancelledAt: null,
        endTime: { $gt: now },
      });
      if (activeContestsCount >= limits.maxActiveUserContests) {
        return res.status(400).json({
          message: `You have reached the maximum limit of ${limits.maxActiveUserContests} active contests.`,
        });
      }
    }

    // 8. Problem selection validation & pool availability check
    const selectionMode = selection?.mode === 'manual' || (Array.isArray(problems) && problems.length > 0) ? 'manual' : 'random';
    let contestProblems = [];
    let contestSelection = {
      mode: selectionMode,
      counts: { easy: 0, medium: 0, hard: 0 },
      excludeSolvedByParticipants: Boolean(selection?.excludeSolvedByParticipants),
    };

    const maxQuestions = isAdmin ? limits.maxQuestionsAdmin : limits.maxQuestionsUser;

    if (selectionMode === 'random') {
      const easyCount = Math.max(0, parseInt(selection?.counts?.easy, 10) || 0);
      const mediumCount = Math.max(0, parseInt(selection?.counts?.medium, 10) || 0);
      const hardCount = Math.max(0, parseInt(selection?.counts?.hard, 10) || 0);
      const totalQuestions = easyCount + mediumCount + hardCount;

      if (totalQuestions < 1) {
        return res.status(400).json({ message: 'Please select at least 1 problem for the contest.' });
      }
      if (totalQuestions > maxQuestions) {
        return res.status(400).json({
          message: `Total problems cannot exceed ${maxQuestions} (requested ${totalQuestions}).`,
        });
      }

      contestSelection.counts = { easy: easyCount, medium: mediumCount, hard: hardCount };

      // Pool availability check
      if (type === 'dsa') {
        const [availEasy, availMed, availHard] = await Promise.all([
          Problem.countDocuments({ difficulty: 'easy' }),
          Problem.countDocuments({ difficulty: 'medium' }),
          Problem.countDocuments({ difficulty: 'hard' }),
        ]);

        if (easyCount > availEasy) {
          return res.status(400).json({
            message: `Requested ${easyCount} easy DSA problems, but only ${availEasy} available in pool.`,
          });
        }
        if (mediumCount > availMed) {
          return res.status(400).json({
            message: `Requested ${mediumCount} medium DSA problems, but only ${availMed} available in pool.`,
          });
        }
        if (hardCount > availHard) {
          return res.status(400).json({
            message: `Requested ${hardCount} hard DSA problems, but only ${availHard} available in pool.`,
          });
        }
      } else {
        // API pool: BuildProblem with verified: true
        const [availEasy, availMed, availHard] = await Promise.all([
          BuildProblem.countDocuments({ verified: true, difficulty: { $regex: /^easy$/i } }),
          BuildProblem.countDocuments({ verified: true, difficulty: { $regex: /^medium$/i } }),
          BuildProblem.countDocuments({ verified: true, difficulty: { $regex: /^hard$/i } }),
        ]);

        if (easyCount > availEasy) {
          return res.status(400).json({
            message: `Requested ${easyCount} easy API problems, but only ${availEasy} verified problems available in pool.`,
          });
        }
        if (mediumCount > availMed) {
          return res.status(400).json({
            message: `Requested ${mediumCount} medium API problems, but only ${availMed} verified problems available in pool.`,
          });
        }
        if (hardCount > availHard) {
          return res.status(400).json({
            message: `Requested ${hardCount} hard API problems, but only ${availHard} verified problems available in pool.`,
          });
        }
      }
    } else {
      // Manual selection (Admin only)
      if (!Array.isArray(problems) || problems.length === 0) {
        return res.status(400).json({ message: 'Manual selection requires an array of problems.' });
      }
      if (problems.length > maxQuestions) {
        return res.status(400).json({
          message: `Manual problem count cannot exceed ${maxQuestions}.`,
        });
      }

      // Validate each problem exists in the correct collection
      const targetModel = type === 'dsa' ? 'Problem' : 'BuildProblem';
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

      for (let i = 0; i < problems.length; i++) {
        const item = problems[i];
        const pId = item.problemId || item.id || item._id;

        if (!mongoose.Types.ObjectId.isValid(pId)) {
          return res.status(400).json({ message: `Invalid problem ID at index ${i}.` });
        }

        let exists;
        if (type === 'dsa') {
          exists = await Problem.findById(pId);
        } else {
          exists = await BuildProblem.findOne({ _id: pId, verified: true });
        }

        if (!exists) {
          return res.status(400).json({
            message: `Problem at index ${i} (${pId}) does not exist or is not verified in the ${type.toUpperCase()} pool.`,
          });
        }

        contestProblems.push({
          problemModel: targetModel,
          problemId: exists._id,
          label: item.label || letters[i] || `P${i + 1}`,
          points: parseInt(item.points, 10) || 100,
        });
      }
    }

    // 9. Participants limits & defaults
    const resolvedMaxParticipants = maxParticipants
      ? Math.max(1, parseInt(maxParticipants, 10))
      : type === 'dsa'
      ? limits.defaultMaxParticipantsDSA
      : limits.defaultMaxParticipantsAPI;

    const resolvedAllowLateJoin = allowLateJoin !== undefined ? Boolean(allowLateJoin) : kind === 'public';
    const resolvedPenalty = penaltyMinutes !== undefined ? Math.max(0, parseInt(penaltyMinutes, 10)) : limits.defaultPenaltyMinutes;

    // 10. Generate unique joinCode for private contests
    let joinCode = null;
    if (kind === 'private') {
      let attempts = 0;
      while (!joinCode && attempts < 10) {
        const candidate = generateJoinCode();
        const existing = await Contest.findOne({ joinCode: candidate });
        if (!existing) {
          joinCode = candidate;
        }
        attempts++;
      }
      if (!joinCode) {
        return res.status(500).json({ message: 'Failed to generate unique join code. Please try again.' });
      }
    }

    // 11. Create Contest document
    const contest = await Contest.create({
      title: title.trim(),
      description: (description || '').trim(),
      kind,
      type,
      scoring: resolvedScoring,
      createdBy: req.user._id,
      startTime: start,
      durationMinutes: duration,
      endTime: end,
      problems: contestProblems,
      selection: contestSelection,
      joinCode,
      maxParticipants: resolvedMaxParticipants,
      allowLateJoin: resolvedAllowLateJoin,
      penaltyMinutes: resolvedPenalty,
      participantsCount: 1, // Creator auto-joins
    });

    // Automatically register creator as first participant
    await ContestParticipant.create({
      contestId: contest._id,
      userId: req.user._id,
      joinedAt: new Date(),
    });

    // If random selection mode, select problems immediately so they are pre-populated and ready
    if (contestSelection.mode === 'random') {
      try {
        const selected = await executeProblemSelection(contest._id);
        if (selected && selected.length > 0) {
          contest.problems = selected;
        }
      } catch (selErr) {
        console.warn('⚠️ Problem selection notice on creation:', selErr.message);
      }
    }

    // Schedule BullMQ lifecycle jobs (start, end, reminder)
    scheduleContestLifecycleJobs(contest).catch((err) => {
      console.warn('⚠️ Lifecycle job schedule warning:', err.message);
    });

    // If public contest, queue announcement broadcast to opted-in users
    if (contest.kind === 'public') {
      try {
        const { addEmailJob } = require('../queues/emailQueue');
        addEmailJob('announce-contest', { contestId: contest._id }, { priority: 5 }).catch((err) => {
          console.warn('⚠️ Announcement email queue warning:', err.message);
        });
      } catch (_) {}
    }

    return res.status(201).json({
      status: 'success',
      contest: formatContestResponse(contest, req.user, true),
      serverNow: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error creating contest:', err);
    return res.status(500).json({ message: err.message || 'Server error creating contest.' });
  }
};

/**
 * GET /api/contests
 * List contests with status, type, and kind filters
 */
exports.getContests = async (req, res) => {
  try {
    const { status, type, kind } = req.query;
    const now = new Date();
    const user = req.user;
    const isAdmin = user && user.role === 'admin';

    const query = {};

    // Filter by type (dsa / api)
    if (type && ['dsa', 'api'].includes(type.toLowerCase())) {
      query.type = type.toLowerCase();
    }

    // Filter by kind (public / private) and privacy rules
    if (kind && ['public', 'private'].includes(kind.toLowerCase())) {
      if (kind.toLowerCase() === 'public') {
        query.kind = 'public';
      } else {
        // Private contests: visible only to creator or registered participants
        if (!user) {
          return res.status(200).json({ status: 'success', count: 0, contests: [], serverNow: now.toISOString() });
        }
        if (!isAdmin) {
          const userParticipantContests = await ContestParticipant.find({ userId: user._id }).distinct('contestId');
          query.kind = 'private';
          query.$or = [{ createdBy: user._id }, { _id: { $in: userParticipantContests } }];
        } else {
          query.kind = 'private';
        }
      }
    } else {
      // No kind specified: public contests + private contests user belongs to
      if (!user) {
        query.kind = 'public';
      } else if (!isAdmin) {
        const userParticipantContests = await ContestParticipant.find({ userId: user._id }).distinct('contestId');
        query.$or = [
          { kind: 'public' },
          { kind: 'private', createdBy: user._id },
          { kind: 'private', _id: { $in: userParticipantContests } },
        ];
      }
    }

    // Filter by computed status
    if (status) {
      const s = status.toLowerCase();
      if (s === 'cancelled') {
        query.cancelledAt = { $ne: null };
      } else if (s === 'scheduled') {
        query.cancelledAt = null;
        query.startTime = { $gt: now };
      } else if (s === 'running') {
        query.cancelledAt = null;
        query.startTime = { $lte: now };
        query.endTime = { $gt: now };
      } else if (s === 'ended') {
        query.cancelledAt = null;
        query.endTime = { $lte: now };
      }
    }

    const contests = await Contest.find(query)
      .select('-problems.problemId -problems.statement -problems.tests')
      .populate('createdBy', 'name email avatar')
      .sort({ startTime: -1 });

    const formatted = contests.map((c) => formatContestResponse(c, user));

    return res.status(200).json({
      status: 'success',
      count: formatted.length,
      contests: formatted,
      serverNow: now.toISOString(),
    });
  } catch (err) {
    console.error('Error fetching contests:', err);
    return res.status(500).json({ message: 'Server error fetching contests.' });
  }
};

/**
 * GET /api/contests/:id
 * Get contest details
 */
exports.getContestById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Contest not found.' });
    }

    const contest = await Contest.findById(id).populate('createdBy', 'name email avatar');
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found.' });
    }

    const user = req.user;
    const isAdmin = user && user.role === 'admin';
    const isCreator = user && contest.createdBy && contest.createdBy._id.toString() === user._id.toString();

    // Check participant status
    let isParticipant = false;
    if (user) {
      const part = await ContestParticipant.findOne({ contestId: contest._id, userId: user._id });
      isParticipant = Boolean(part);
    }

    // Privacy rule for private contests
    if (contest.kind === 'private' && !isCreator && !isParticipant && !isAdmin) {
      return res.status(403).json({ message: 'You are not a participant in this private contest.' });
    }

    return res.status(200).json({
      status: 'success',
      contest: formatContestResponse(contest, user, isParticipant),
      isParticipant,
      serverNow: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error fetching contest details:', err);
    return res.status(500).json({ message: 'Server error fetching contest details.' });
  }
};

/**
 * PUT /api/contests/:id
 * Edit contest before start (Creator or admin only)
 */
exports.updateContest = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Contest not found.' });
    }

    const contest = await Contest.findById(id);
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found.' });
    }

    const user = req.user;
    const isAdmin = user && user.role === 'admin';
    const isCreator = user && contest.createdBy.toString() === user._id.toString();

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to edit this contest.' });
    }

    const now = new Date();
    const status = computeContestStatus(contest, now);

    if (status !== 'scheduled') {
      return res.status(400).json({ message: 'Contest can only be edited before it starts.' });
    }

    const limits = getEnvLimits();
    const { title, description, durationMinutes, startTime } = req.body;

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 120) {
        return res.status(400).json({ message: 'Title must be between 3 and 120 characters.' });
      }
      contest.title = title.trim();
    }

    if (description !== undefined) {
      contest.description = (description || '').trim();
    }

    if (startTime !== undefined) {
      const newStart = new Date(startTime);
      if (isNaN(newStart.getTime()) || newStart < new Date(now.getTime() - 30000)) {
        return res.status(400).json({ message: 'Start time cannot be in the past.' });
      }
      contest.startTime = newStart;
    }

    if (durationMinutes !== undefined) {
      const duration = parseInt(durationMinutes, 10);
      if (isNaN(duration) || duration < limits.minDurationMinutes || duration > limits.maxDurationMinutes) {
        return res.status(400).json({
          message: `Duration must be between ${limits.minDurationMinutes} and ${limits.maxDurationMinutes} minutes.`,
        });
      }
      contest.durationMinutes = duration;
    }

    // Recalculate endTime
    contest.endTime = new Date(contest.startTime.getTime() + contest.durationMinutes * 60000);

    await contest.save();

    // Reschedule lifecycle jobs with updated timing
    scheduleContestLifecycleJobs(contest).catch((err) => {
      console.warn('⚠️ Lifecycle job reschedule warning:', err.message);
    });

    return res.status(200).json({
      status: 'success',
      contest: formatContestResponse(contest, req.user, true),
      serverNow: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error updating contest:', err);
    return res.status(500).json({ message: 'Server error updating contest.' });
  }
};

/**
 * POST /api/contests/:id/cancel
 * Cancel a contest (Creator/Admin before start; Admin only after start)
 */
exports.cancelContest = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Contest not found.' });
    }

    const contest = await Contest.findById(id);
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found.' });
    }

    if (contest.cancelledAt) {
      return res.status(400).json({ message: 'Contest is already cancelled.' });
    }

    const user = req.user;
    const isAdmin = user && user.role === 'admin';
    const isCreator = user && contest.createdBy.toString() === user._id.toString();

    const now = new Date();
    const status = computeContestStatus(contest, now);

    // After start, ONLY admin can cancel
    if (status !== 'scheduled' && !isAdmin) {
      return res.status(403).json({ message: 'Only administrators can cancel a contest after it has started.' });
    }

    // Before start, creator or admin can cancel
    if (!isCreator && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to cancel this contest.' });
    }

    contest.cancelledAt = now;
    await contest.save();

    // Cancel delayed BullMQ lifecycle jobs
    cancelContestLifecycleJobs(contest._id).catch((err) => {
      console.warn('⚠️ Lifecycle job cancellation warning:', err.message);
    });

    return res.status(200).json({
      status: 'success',
      message: 'Contest cancelled successfully.',
      contest: formatContestResponse(contest, req.user, true),
      serverNow: now.toISOString(),
    });
  } catch (err) {
    console.error('Error cancelling contest:', err);
    return res.status(500).json({ message: 'Server error cancelling contest.' });
  }
};

/**
 * GET /api/contests/:id/problems
 * Fetch problems for a contest (Only available during or after contest to participants/admins)
 */
exports.getContestProblems = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Contest not found.' });
    }

    const contest = await Contest.findById(id);
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found.' });
    }

    const now = new Date();
    const status = computeContestStatus(contest, now);
    const user = req.user;
    const isAdmin = user && user.role === 'admin';
    const isCreator = user && contest.createdBy && contest.createdBy.toString() === user._id.toString();

    // 1. Hide statements before start (admins and creators can always preview)
    if (status === 'scheduled' && !isAdmin && !isCreator) {
      return res.status(403).json({ message: 'Problem statements are hidden until the contest begins.' });
    }

    // 2. Only participants, creators, and admins can view problems
    let isParticipant = false;
    if (user) {
      const part = await ContestParticipant.findOne({ contestId: contest._id, userId: user._id });
      isParticipant = Boolean(part);
    }

    if (!isParticipant && !isAdmin && !isCreator) {
      return res.status(403).json({ message: 'Only contest participants can access contest problems.' });
    }

    // 3. Ensure problems are selected if random mode and problems array is empty
    if (contest.selection?.mode === 'random' && (!contest.problems || contest.problems.length === 0)) {
      try {
        contest.problems = await executeProblemSelection(contest._id);
      } catch (selErr) {
        console.warn('⚠️ Problem selection on getContestProblems warning:', selErr.message);
      }
    }

    // 4. Populate problems safely with statement, description, testCases, constraints
    const problemsWithDetails = [];
    for (const item of contest.problems || []) {
      const isApi = item.problemModel === 'BuildProblem' || contest.type === 'api';

      if (!isApi) {
        let dsaProb = await Problem.findById(item.problemId)
          .select('title slug description difficulty constraints sampleTestCases timeLimit memoryLimit tags inputFormat outputFormat');
        if (!dsaProb) {
          dsaProb = await BuildProblem.findById(item.problemId);
        }

        if (dsaProb) {
          const text = dsaProb.description || dsaProb.statement || '';
          problemsWithDetails.push({
            _id: dsaProb._id,
            problemId: dsaProb._id,
            label: item.label,
            points: item.points,
            problemModel: 'Problem',
            title: dsaProb.title,
            slug: dsaProb.slug,
            description: text,
            statement: text,
            difficulty: dsaProb.difficulty,
            constraints: dsaProb.constraints || '',
            inputFormat: dsaProb.inputFormat || '',
            outputFormat: dsaProb.outputFormat || '',
            testCases: dsaProb.sampleTestCases || (dsaProb.visibleTests || []).map((t) => ({
              input: `${t.request?.method || 'GET'} ${t.request?.path || '/'}`,
              output: `Status: ${t.expect?.status || 200}`,
              explanation: t.name,
            })),
            timeLimit: dsaProb.timeLimit || 2000,
            memoryLimit: dsaProb.memoryLimit || 256,
            tags: dsaProb.tags || [],
            problem: dsaProb,
          });
        }
      } else {
        let buildProb = await BuildProblem.findById(item.problemId)
          .select('title slug statement difficulty starterFiles visibleTests limits runtime');
        if (!buildProb) {
          buildProb = await Problem.findById(item.problemId);
        }

        if (buildProb) {
          const text = buildProb.statement || buildProb.description || '';
          problemsWithDetails.push({
            _id: buildProb._id,
            problemId: buildProb._id,
            label: item.label,
            points: item.points,
            problemModel: 'BuildProblem',
            title: buildProb.title,
            slug: buildProb.slug,
            description: text,
            statement: text,
            difficulty: buildProb.difficulty,
            testCases: (buildProb.visibleTests || []).map((t) => ({
              input: `${t.request?.method || 'GET'} ${t.request?.path || '/'}`,
              output: `Status: ${t.expect?.status || 200}`,
              explanation: t.name,
            })),
            runtime: buildProb.runtime || 'node-express',
            problem: buildProb,
          });
        }
      }
    }

    return res.status(200).json({
      status: 'success',
      count: problemsWithDetails.length,
      problems: problemsWithDetails,
      serverNow: now.toISOString(),
    });
  } catch (err) {
    console.error('Error fetching contest problems:', err);
    return res.status(500).json({ message: 'Server error fetching contest problems.' });
  }
};

/**
 * POST /api/contests/:id/join
 * Join a public contest (or authorized private contest)
 */
exports.joinContest = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Contest not found.' });
    }

    const contest = await Contest.findById(id);
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found.' });
    }

    if (contest.isCancelled) {
      return res.status(400).json({ message: 'Cannot join a cancelled contest.' });
    }

    const now = new Date();
    const status = computeContestStatus(contest, now);

    if (status === 'ended') {
      return res.status(400).json({ message: 'Contest has already ended.' });
    }

    if (['running', 'active'].includes(status) && !contest.allowLateJoin) {
      return res.status(400).json({ message: 'Late joins are not allowed for this contest.' });
    }

    // If private contest, require join-by-code unless admin or creator
    const isAdmin = req.user && req.user.role === 'admin';
    const isCreator = req.user && contest.createdBy.toString() === req.user._id.toString();
    if (contest.kind === 'private' && !isAdmin && !isCreator) {
      return res.status(403).json({
        message: 'This is a private contest. Please join using the 8-character join code via /api/contests/join-by-code.',
      });
    }

    // Check if user already joined
    const alreadyJoined = await ContestParticipant.findOne({ contestId: contest._id, userId: req.user._id });
    if (alreadyJoined) {
      return res.status(400).json({ message: 'You have already joined this contest.' });
    }

    // Participant cap check
    const participantCount = await ContestParticipant.countDocuments({ contestId: contest._id });
    if (participantCount >= contest.maxParticipants) {
      return res.status(400).json({
        message: `Contest has reached maximum capacity (${contest.maxParticipants} participants).`,
      });
    }

    // Register participant atomically
    try {
      await ContestParticipant.create({
        contestId: contest._id,
        userId: req.user._id,
        joinedAt: now,
      });
    } catch (joinErr) {
      if (joinErr.code === 11000) {
        return res.status(400).json({ message: 'You have already joined this contest.' });
      }
      throw joinErr;
    }

    await Contest.findByIdAndUpdate(contest._id, { $inc: { participantsCount: 1 } });

    return res.status(200).json({
      status: 'success',
      message: 'Successfully joined contest.',
      contest: formatContestResponse(contest, req.user, true),
      serverNow: now.toISOString(),
    });
  } catch (err) {
    console.error('Error joining contest:', err);
    return res.status(500).json({ message: 'Server error joining contest.' });
  }
};

/**
 * POST /api/contests/join-by-code
 * Join a private contest using an 8-character joinCode
 */
exports.joinContestByCode = async (req, res) => {
  try {
    const { joinCode } = req.body;
    if (!joinCode || typeof joinCode !== 'string') {
      return res.status(400).json({ message: 'Contest join code is required.' });
    }

    const normalizedCode = joinCode.trim().toUpperCase();
    if (normalizedCode.length !== 8) {
      return res.status(400).json({ message: 'Invalid join code format. Must be an 8-character code.' });
    }

    const contest = await Contest.findOne({ joinCode: normalizedCode });
    if (!contest) {
      return res.status(404).json({ message: 'Invalid contest join code.' });
    }

    if (contest.isCancelled) {
      return res.status(400).json({ message: 'Cannot join a cancelled contest.' });
    }

    const now = new Date();
    const status = computeContestStatus(contest, now);

    if (status === 'ended') {
      return res.status(400).json({ message: 'Contest has already ended.' });
    }

    if (['running', 'active'].includes(status) && !contest.allowLateJoin) {
      return res.status(400).json({ message: 'Late joins are not allowed for this contest.' });
    }

    // Check if user already joined
    const alreadyJoined = await ContestParticipant.findOne({ contestId: contest._id, userId: req.user._id });
    if (alreadyJoined) {
      return res.status(400).json({ message: 'You have already joined this contest.' });
    }

    // Participant cap check
    const participantCount = await ContestParticipant.countDocuments({ contestId: contest._id });
    if (participantCount >= contest.maxParticipants) {
      return res.status(400).json({
        message: `Contest has reached maximum capacity (${contest.maxParticipants} participants).`,
      });
    }

    // Register participant atomically
    try {
      await ContestParticipant.create({
        contestId: contest._id,
        userId: req.user._id,
        joinedAt: now,
      });
    } catch (joinErr) {
      if (joinErr.code === 11000) {
        return res.status(400).json({ message: 'You have already joined this contest.' });
      }
      throw joinErr;
    }

    await Contest.findByIdAndUpdate(contest._id, { $inc: { participantsCount: 1 } });

    return res.status(200).json({
      status: 'success',
      message: 'Successfully joined private contest.',
      contest: formatContestResponse(contest, req.user, true),
      serverNow: now.toISOString(),
    });
  } catch (err) {
    console.error('Error joining contest by code:', err);
    return res.status(500).json({ message: 'Server error joining contest by code.' });
  }
};

/**
 * POST /api/contests/:id/leave
 * Leave a contest (Only permitted BEFORE contest starts)
 */
exports.leaveContest = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Contest not found.' });
    }

    const contest = await Contest.findById(id);
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found.' });
    }

    const now = new Date();
    const status = computeContestStatus(contest, now);

    if (status !== 'scheduled') {
      return res.status(400).json({ message: 'Cannot leave a contest that has already started or ended.' });
    }

    // Creator cannot leave their own contest; they can cancel it instead
    if (contest.createdBy.toString() === req.user._id.toString()) {
      return res.status(400).json({
        message: 'Contest creator cannot leave the contest. You can cancel it instead.',
      });
    }

    const deleted = await ContestParticipant.findOneAndDelete({
      contestId: contest._id,
      userId: req.user._id,
    });

    if (!deleted) {
      return res.status(400).json({ message: 'You are not a registered participant in this contest.' });
    }

    await Contest.findByIdAndUpdate(contest._id, { $inc: { participantsCount: -1 } });

    return res.status(200).json({
      status: 'success',
      message: 'Successfully left the contest.',
      serverNow: now.toISOString(),
    });
  } catch (err) {
    console.error('Error leaving contest:', err);
    return res.status(500).json({ message: 'Server error leaving contest.' });
  }
};

/**
 * POST /api/contests/:id/invite
 * Invite participants by email (Creator or Admin only, max 20 per call)
 */
exports.inviteParticipants = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Contest not found.' });
    }

    const contest = await Contest.findById(id);
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found.' });
    }

    const isAdmin = req.user && req.user.role === 'admin';
    const isCreator = req.user && contest.createdBy.toString() === req.user._id.toString();

    if (!isAdmin && !isCreator) {
      return res.status(403).json({ message: 'Only the contest creator or an administrator can send invitations.' });
    }

    const { emails } = req.body;
    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ message: 'Please provide an array of emails to invite.' });
    }
    if (emails.length > 20) {
      return res.status(400).json({ message: 'Cannot invite more than 20 participants per request.' });
    }

    const invited = [];
    const notFound = [];

    for (const email of emails) {
      if (typeof email !== 'string' || !email.includes('@')) {
        continue;
      }
      const targetUser = await User.findOne({ email: email.trim().toLowerCase() });
      if (!targetUser) {
        notFound.push(email.trim().toLowerCase());
        continue;
      }

      // Record invitation notification
      await ContestNotification.findOneAndUpdate(
        { contestId: contest._id, userId: targetUser._id, type: 'invite' },
        {
          $setOnInsert: {
            contestId: contest._id,
            userId: targetUser._id,
            type: 'invite',
            createdAt: new Date(),
          },
        },
        { upsert: true, new: true }
      );

      // Queue email notification
      try {
        const { addEmailJob } = require('../queues/emailQueue');
        addEmailJob('invite-contest', {
          contestId: contest._id,
          userId: targetUser._id,
          inviterId: req.user._id,
        }, { priority: 2 }).catch((err) => {
          console.warn(`⚠️ Failed to queue invitation email for ${targetUser.email}:`, err.message);
        });
      } catch (_) {}

      invited.push({ email: targetUser.email, userId: targetUser._id });
    }

    return res.status(200).json({
      status: 'success',
      message: `Invited ${invited.length} participants (${notFound.length} emails not found).`,
      invitedCount: invited.length,
      notFoundCount: notFound.length,
      invited,
      notFound,
    });
  } catch (err) {
    console.error('Error inviting participants:', err);
    return res.status(500).json({ message: 'Server error inviting participants.' });
  }
};

/**
 * GET /api/contests/:id/standings
 * Get contest leaderboard standings with ranks
 */
exports.getContestStandings = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Contest not found.' });
    }

    const { page, limit, nocache } = req.query;
    const bypassCache = nocache === 'true';
    const leaderboard = await getContestLeaderboard(id, { page, limit, bypassCache });
    if (!leaderboard) {
      return res.status(404).json({ message: 'Contest not found.' });
    }

    if (leaderboard._telemetry) {
      res.set('X-Cache-Hit', String(leaderboard._telemetry.cacheHit));
      res.set('X-Lock-Wait-Ms', String(leaderboard._telemetry.lockWaitTimeMs));
      res.set('X-Mongo-Queries', String(leaderboard._telemetry.mongoQueries));
    }

    return res.status(200).json({
      status: 'success',
      ...leaderboard,
      serverNow: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error fetching contest standings:', err);
    return res.status(500).json({ message: 'Server error fetching standings.' });
  }
};

/**
 * GET /api/contests/:id/stats
 * Get contest analytics: total participants, total submissions, problem acceptance rates
 */
exports.getContestStats = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Contest not found.' });
    }

    const stats = await fetchContestStats(id);

    return res.status(200).json({
      status: 'success',
      stats,
      serverNow: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error fetching contest stats:', err);
    return res.status(500).json({ message: 'Server error fetching contest stats.' });
  }
};

/**
 * GET /api/contests/unsubscribe?token=xyz
 * One-click unsubscribe from contest email notifications
 */
exports.unsubscribeFromEmails = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ message: 'Missing or invalid unsubscribe token.' });
    }

    const user = await User.findOne({ unsubscribeToken: token });
    if (!user) {
      return res.status(404).json({ message: 'Invalid or expired unsubscribe token.' });
    }

    user.emailNotifications = false;
    await user.save();

    // If client requested HTML (e.g. clicked link in email client)
    if (req.accepts('html') && !req.xhr && !req.headers.accept?.includes('application/json')) {
      return res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Unsubscribed - Codexium</title>
</head>
<body style="margin: 0; padding: 60px 20px; background-color: #0f172a; font-family: sans-serif; color: #f8fafc; text-align: center;">
  <div style="max-width: 500px; margin: 0 auto; background-color: #1e293b; padding: 40px; border-radius: 12px; border: 1px solid #334155;">
    <div style="font-size: 48px; margin-bottom: 16px;">🔕</div>
    <h2 style="margin: 0 0 12px 0; color: #ffffff;">Successfully Unsubscribed</h2>
    <p style="color: #94a3b8; font-size: 15px; line-height: 1.5;">You will no longer receive contest announcements or reminder emails for <strong>${user.email}</strong>.</p>
    <p style="color: #64748b; font-size: 13px; margin-top: 24px;">You can re-enable notifications at any time in your Codexium profile settings.</p>
  </div>
</body>
</html>
      `.trim());
    }

    return res.status(200).json({
      status: 'success',
      message: 'You have been successfully unsubscribed from contest notifications.',
      email: user.email,
      emailNotifications: false,
    });
  } catch (err) {
    console.error('Error processing unsubscribe:', err);
    return res.status(500).json({ message: 'Server error processing unsubscribe request.' });
  }
};

/**
 * POST /api/contests/notifications/preferences
 * Update current user's contest notification settings (Authenticated)
 */
exports.toggleEmailNotifications = async (req, res) => {
  try {
    const { enabled } = req.body;
    if (enabled === undefined) {
      return res.status(400).json({ message: 'Field "enabled" (boolean) is required.' });
    }

    req.user.emailNotifications = Boolean(enabled);
    await req.user.save();

    return res.status(200).json({
      status: 'success',
      message: `Contest notifications ${req.user.emailNotifications ? 'enabled' : 'disabled'}.`,
      emailNotifications: req.user.emailNotifications,
    });
  } catch (err) {
    console.error('Error toggling email notifications:', err);
    return res.status(500).json({ message: 'Server error updating notification settings.' });
  }
};

/**
 * GET /api/contests/:id/submissions
 * Fetch submissions for the authenticated user in this contest, optionally filtered by problemId
 */
exports.getContestUserSubmissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { problemId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Contest not found.' });
    }

    const contest = await Contest.findById(id);
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found.' });
    }

    let submissions = [];

    if (contest.type === 'dsa') {
      const filter = {
        contestId: contest._id,
        user: req.user._id,
      };
      if (problemId && mongoose.Types.ObjectId.isValid(problemId)) {
        filter.problem = problemId;
      }
      submissions = await Submission.find(filter)
        .sort({ createdAt: -1 })
        .select('status language runtime memory createdAt submittedAt passedTestCases totalTestCases code errorLog problem');
    } else {
      const filter = {
        contestId: contest._id,
        userId: req.user._id,
      };
      if (problemId && mongoose.Types.ObjectId.isValid(problemId)) {
        filter.problemId = problemId;
      }
      submissions = await BuildSubmission.find(filter)
        .sort({ createdAt: -1 })
        .select('status language runtime score passed total createdAt submittedAt repoUrl problemId');
    }

    return res.status(200).json({
      status: 'success',
      count: submissions.length,
      submissions,
    });
  } catch (err) {
    console.error('Error fetching contest user submissions:', err);
    return res.status(500).json({ message: 'Server error fetching submissions.' });
  }
};

/**
 * POST /api/contests/:id/ratings/calculate
 * Calculate or re-calculate LeetCode-style ratings for this contest (Admin or Creator)
 */
exports.calculateContestRatings = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Contest not found.' });
    }

    const contest = await Contest.findById(id);
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found.' });
    }

    const isAdmin = req.user && req.user.role === 'admin';
    const isCreator = req.user && contest.createdBy?.toString() === req.user._id?.toString();
    if (!isAdmin && !isCreator) {
      return res.status(403).json({ message: 'Only admin or contest creator can trigger rating calculation.' });
    }

    const { applyContestRatings } = require('../services/contestRatingService');
    const result = await applyContestRatings(contest._id);

    return res.status(200).json({
      status: 'success',
      message: 'Ratings successfully calculated.',
      ...result,
    });
  } catch (err) {
    console.error('Error calculating contest ratings:', err);
    return res.status(500).json({ message: err.message || 'Server error calculating ratings.' });
  }
};
