const Submission = require('../models/Submission');
const BuildSubmission = require('../models/BuildSubmission');
const Problem = require('../models/Problem');
const User = require('../models/Users');
const Contest = require('../models/Contest');
const ContestParticipant = require('../models/ContestParticipant');
const { updateUserContestStanding } = require('../services/contestLeaderboardService');
const mongoose = require('mongoose');
const judge0Service = require('../services/judge0Service');
const languageMap = require('../utils/languageMap');
const { submissionQueue, addSubmissionJob } = require('../queues/submissionQueue');

// Helper for pagination
const getPagination = (page, limit) => {
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  const skip = (pageNum - 1) * limitNum;
  return { page: pageNum, limit: limitNum, skip };
};

// Map fallback names in case languageMap uses different key formatting or IDs
const getLanguageId = (lang) => {
  if (!lang) return null;

  // If already a valid numeric ID passed from frontend
  if (typeof lang === 'number' || !isNaN(Number(lang))) {
    return Number(lang);
  }

  const normalized = lang.toString().toLowerCase().trim();

  // Try direct lookup from user's languageMap module
  if (languageMap.JUDGE0_LANGUAGE_MAP && languageMap.JUDGE0_LANGUAGE_MAP[normalized]) {
    return languageMap.JUDGE0_LANGUAGE_MAP[normalized];
  }

  // Common fallbacks for Judge0 CE IDs
  const fallbackMap = {
    'cpp': 54,        // C++ (GCC 9.2.0)
    'c_cpp': 54,
    'c++': 54,
    'python': 71,     // Python (3.8.1)
    'py': 71,
    'python3': 71,
    'java': 62,       // Java (OpenJDK 13.0.1)
    'javascript': 63, // JavaScript (Node.js 12.14.0)
    'js': 63,
    'c': 50,          // C (GCC 9.2.0)
    'assembly': 45,   // Assembly (NASM 2.14.02)
    'asm': 45,
    'cobol': 77,      // COBOL (GnuCOBOL 3.0.0)
    'cob': 77,
  };

  return fallbackMap[normalized] || null;
};

// @desc    Create a new submission
// @route   POST /api/submissions
// @access  Private
exports.createSubmission = async (req, res) => {
  try {
    const { problemId, language, code, contestId } = req.body;

    if (!problemId || !language || !code) {
      return res.status(400).json({
        message: 'Please provide problemId, language, and code',
      });
    }

    // 0. Contest validation (if contestId is provided)
    let validatedContest = null;
    let isContestEnded = false;
    if (contestId) {
      if (!mongoose.Types.ObjectId.isValid(contestId)) {
        return res.status(400).json({ message: 'Invalid contestId format.' });
      }
      validatedContest = await Contest.findById(contestId);
      if (!validatedContest) {
        return res.status(404).json({ message: 'Contest not found.' });
      }
      if (validatedContest.isCancelled) {
        return res.status(400).json({ message: 'Contest has been cancelled.' });
      }
      if (validatedContest.type !== 'dsa') {
        return res.status(400).json({
          message: 'This contest is an API contest. Submissions must be made via /api/build/submit.',
        });
      }

      const now = new Date();
      if (now < new Date(validatedContest.startTime)) {
        return res.status(400).json({ message: 'Contest has not started yet.' });
      }
      isContestEnded = now >= new Date(validatedContest.endTime) || validatedContest.status === 'ended';

      // Check participant (only enforced during live contest; after contest, any user can practice submit)
      if (!isContestEnded) {
        let isParticipant = await ContestParticipant.findOne({
          contestId: validatedContest._id,
          userId: req.user._id,
        });
        if (!isParticipant) {
          const isPrivileged = validatedContest.creatorId?.toString() === req.user._id.toString() || req.user.role === 'admin';
          if (isPrivileged || validatedContest.allowLateJoin) {
            isParticipant = await ContestParticipant.create({
              contestId: validatedContest._id,
              userId: req.user._id,
            });
            await Contest.findByIdAndUpdate(validatedContest._id, { $inc: { participantsCount: 1 } });
          } else {
            return res.status(403).json({
              message: 'Registration has closed for this live contest. You can submit solutions once the contest ends.',
            });
          }
        }
      }

      // Check problem belongs to contest
      const belongsToContest = (validatedContest.problems || []).some(
        (p) => p.problemId?.toString() === problemId.toString()
      );
      if (!belongsToContest) {
        return res.status(400).json({
          message: 'This problem is not part of the specified contest.',
        });
      }
    }

    // 1. Convert language string or ID to valid Judge0 language ID
    const languageId = getLanguageId(language);
    if (!languageId) {
      return res.status(400).json({
        message: `Unsupported language: "${language}". Please provide a valid language string or ID.`
      });
    }

    // 2. Validate problem exists and fetch hidden test cases
    const problem = await Problem.findById(problemId).select('+hiddenTestCases');
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    const testCasesToRun = problem.hiddenTestCases || [];
    if (testCasesToRun.length === 0) {
      return res.status(400).json({ message: 'This problem has no test cases configured' });
    }

    // 3. Create initial pending submission
    const submission = await Submission.create({
      user: req.user._id,
      problem: problemId,
      contestId: validatedContest ? validatedContest._id : null,
      language,
      code,
      status: 'pending',
      passedTestCases: 0,
      totalTestCases: testCasesToRun.length,
    });

    const testCases = testCasesToRun.map((tc) => ({
      input: tc.input || '',
      output: tc.output || '',
    }));

    // ─── ARCHITECTURE TOGGLE: SUBMIT_MODE=sync vs SUBMIT_MODE=queue ───
    const submitMode = (process.env.SUBMIT_MODE || 'queue').toLowerCase();
    const isSyncMode = submitMode === 'sync';

    if (isSyncMode) {
      // OLD SYNCHRONOUS ROUTE (Before BullMQ / Baseline benchmark)
      let result;
      try {
        result = await judge0Service.runAllTestCases(
          code,
          languageId,
          testCases,
          problem.timeLimit || 2000
        );
      } catch (execErr) {
        const isUnavailable =
          execErr.isServiceUnavailable ||
          execErr.code === 'ECONNREFUSED' ||
          execErr.message?.toLowerCase().includes('offline') ||
          execErr.message?.includes('ECONNREFUSED');

        const friendlyMsg = isUnavailable
          ? 'The code execution engine is temporarily offline. Please try again shortly.'
          : (execErr.friendlyMessage || execErr.message || 'Execution error');

        submission.status = 'error';
        submission.errorLog = friendlyMsg;
        await submission.save().catch(() => {});

        return res.status(isUnavailable ? 503 : 500).json({
          status: 'error',
          message: friendlyMsg,
          isServiceUnavailable: isUnavailable,
          submission,
        });
      }

      submission.status = result.status;
      submission.runtime = result.runtime;
      submission.memory = result.memory;
      submission.passedTestCases = result.passed;
      submission.totalTestCases = result.total;
      if (result.compile_output || result.stderr) {
        submission.errorLog = result.compile_output || result.stderr;
      }
      await submission.save();

      // If accepted, add problem to user's solvedProblems
      if (result.status === 'accepted') {
        await User.findByIdAndUpdate(
          req.user._id,
          { $addToSet: { solvedProblems: problem._id } },
          { new: true }
        );
      }

      // If part of contest, update standing
      if (validatedContest) {
        await updateUserContestStanding(validatedContest._id, req.user._id).catch(() => {});
      }

      return res.status(201).json({
        status: 'success',
        mode: 'sync',
        submission,
      });
    }

    // ASYNC QUEUE ROUTE with automatic in-process fallback if BullMQ/Redis is offline
    await addSubmissionJob(
      {
        submissionId: submission._id,
        code,
        languageId,
        testCases,
        timeLimit: problem.timeLimit || 2000,
        userId: req.user._id,
        problemId: problem._id,
        contestId: validatedContest ? validatedContest._id : null,
      },
      { priority: validatedContest ? 1 : 10 }
    );

    return res.status(202).json({
      status: 'success',
      mode: 'queue',
      message: 'Submission queued successfully',
      submissionId: submission._id,
      submissionStatus: 'pending',
      submission,
    });
  } catch (error) {
    console.error('🔥 createSubmission controller error:', error.message);
    const isUnavailable =
      error.isServiceUnavailable ||
      error.code === 'ECONNREFUSED' ||
      error.message?.toLowerCase().includes('offline') ||
      error.message?.includes('ECONNREFUSED');

    const statusCode = isUnavailable ? 503 : 500;
    const message = isUnavailable
      ? 'The code execution engine is temporarily offline. Please try again shortly.'
      : (error.friendlyMessage || error.message);

    res.status(statusCode).json({ message, isServiceUnavailable: isUnavailable });
  }
};

// @desc    Get logged-in user's submissions
// @route   GET /api/submissions/my
// @access  Private
exports.getMySubmissions = async (req, res) => {
  try {
    const { page = 1, limit = 10, type = 'dsa' } = req.query;
    const { skip, page: pageNum, limit: limitNum } = getPagination(page, limit);

    if (type === 'build') {
      const [submissions, total] = await Promise.all([
        BuildSubmission.find({ userId: req.user._id })
          .populate('problemId', 'title slug difficulty')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        BuildSubmission.countDocuments({ userId: req.user._id }),
      ]);

      const formatted = submissions.map((s) => ({
        _id: s._id,
        user: s.userId,
        problem: s.problemId,
        status: s.status,
        score: s.score,
        passed: s.passed,
        total: s.total,
        language: 'node',
        isBuild: true,
        submittedAt: s.createdAt,
        createdAt: s.createdAt,
      }));

      return res.status(200).json({
        status: 'success',
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        count: formatted.length,
        submissions: formatted,
      });
    }

    if (type === 'all') {
      const [dsaSubs, buildSubs] = await Promise.all([
        Submission.find({ user: req.user._id })
          .populate('problem', 'title slug difficulty')
          .sort({ createdAt: -1 })
          .lean(),
        BuildSubmission.find({ userId: req.user._id })
          .populate('problemId', 'title slug difficulty')
          .sort({ createdAt: -1 })
          .lean(),
      ]);

      const normalizedDsa = dsaSubs.map((s) => ({
        ...s,
        isBuild: false,
        submittedAt: s.submittedAt || s.createdAt,
      }));

      const normalizedBuild = buildSubs.map((s) => ({
        _id: s._id,
        user: s.userId,
        problem: s.problemId,
        status: s.status,
        score: s.score,
        passed: s.passed,
        total: s.total,
        language: 'node',
        isBuild: true,
        submittedAt: s.createdAt,
        createdAt: s.createdAt,
      }));

      const merged = [...normalizedDsa, ...normalizedBuild].sort(
        (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
      );

      const total = merged.length;
      const paginated = merged.slice(skip, skip + limitNum);

      return res.status(200).json({
        status: 'success',
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        count: paginated.length,
        submissions: paginated,
      });
    }

    const [submissions, total] = await Promise.all([
      Submission.find({ user: req.user._id })
        .populate('problem', 'title slug difficulty')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Submission.countDocuments({ user: req.user._id }),
    ]);

    res.status(200).json({
      status: 'success',
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      count: submissions.length,
      submissions,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get submissions for a specific problem
// @route   GET /api/submissions/problem/:problemId
// @access  Private
exports.getProblemSubmissions = async (req, res) => {
  try {
    const { problemId } = req.params;
    const { page = 1, limit = 10, userId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(problemId)) {
      return res.status(400).json({ message: 'Invalid problem ID' });
    }

    const filter = { problem: problemId };

    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      filter.user = userId;
    }

    const { skip, page: pageNum, limit: limitNum } = getPagination(page, limit);

    const [submissions, total] = await Promise.all([
      Submission.find(filter)
        .populate('user', 'name email')
        .populate('problem', 'title slug difficulty')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Submission.countDocuments(filter),
    ]);

    res.status(200).json({
      status: 'success',
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      count: submissions.length,
      submissions,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a single submission by ID
// @route   GET /api/submissions/:id
// @access  Private (owner or admin)
exports.getSubmissionById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid submission ID' });
    }

    let submission = await Submission.findById(id)
      .populate('user', 'name email')
      .populate('problem', 'title slug difficulty description')
      .lean();

    if (!submission) {
      // Check BuildSubmission
      const buildSub = await BuildSubmission.findById(id)
        .populate('userId', 'name email')
        .populate('problemId', 'title slug statement difficulty')
        .lean();

      if (buildSub) {
        const isOwner = (buildSub.userId?._id || buildSub.userId)?.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';
        if (!isOwner && !isAdmin) {
          return res.status(403).json({
            message: 'You are not authorized to view this submission',
          });
        }

        return res.status(200).json({
          status: 'success',
          submission: {
            _id: buildSub._id,
            isBuild: true,
            user: buildSub.userId,
            problem: {
              _id: buildSub.problemId?._id,
              title: buildSub.problemId?.title || 'Build API Challenge',
              slug: buildSub.problemId?.slug || '',
              difficulty: buildSub.problemId?.difficulty || 'Medium',
              description: buildSub.problemId?.statement || '',
            },
            status: buildSub.status,
            score: buildSub.score,
            passed: buildSub.passed,
            total: buildSub.total,
            testResults: (buildSub.testResults || []).map((tr) => ({
              name: tr.name,
              passed: tr.passed,
              visible: tr.visible,
              ...(tr.visible && tr.got ? { got: tr.got } : {}),
            })),
            files: buildSub.files,
            code: buildSub.files?.[0]?.content || '',
            message: buildSub.message,
            createdAt: buildSub.createdAt,
            submittedAt: buildSub.createdAt,
            language: 'javascript',
          },
        });
      }

      return res.status(404).json({ message: 'Submission not found' });
    }

    const isOwner = submission.user._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: 'You are not authorized to view this submission',
      });
    }

    res.status(200).json({
      status: 'success',
      submission,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get aggregate submission statistics & rate graph telemetry for a problem
// @route   GET /api/submissions/problem/:problemId/stats
// @access  Private
exports.getProblemStats = async (req, res) => {
  try {
    const { problemId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(problemId)) {
      return res.status(400).json({ message: 'Invalid problem ID' });
    }

    const allSubmissions = await Submission.find({ problem: problemId })
      .select('status runtime memory language createdAt user')
      .lean();

    const total = allSubmissions.length;
    let accepted = 0;
    let wrongAnswer = 0;
    let timeLimit = 0;
    let runtimeError = 0;
    let compileError = 0;

    const acceptedRuntimes = [];
    const acceptedMemories = [];
    const uniqueUsers = new Set();
    const uniqueAcceptedUsers = new Set();

    allSubmissions.forEach((s) => {
      const uId = String(s.user);
      uniqueUsers.add(uId);

      const st = (s.status || '').toLowerCase();
      if (st === 'accepted' || st === 'ac') {
        accepted++;
        uniqueAcceptedUsers.add(uId);
        if (typeof s.runtime === 'number' && !isNaN(s.runtime) && s.runtime >= 0) {
          acceptedRuntimes.push(s.runtime);
        }
        if (typeof s.memory === 'number' && !isNaN(s.memory) && s.memory >= 0) {
          acceptedMemories.push(s.memory);
        }
      } else if (st === 'wrong_answer' || st === 'wrong answer' || st === 'wa') {
        wrongAnswer++;
      } else if (st.includes('time_limit') || st === 'tle') {
        timeLimit++;
      } else if (st.includes('runtime') || st === 'rte') {
        runtimeError++;
      } else if (st.includes('compil') || st === 'ce') {
        compileError++;
      }
    });

    const other = Math.max(0, total - (accepted + wrongAnswer + timeLimit + runtimeError + compileError));
    const acceptanceRate = total > 0 ? parseFloat(((accepted / total) * 100).toFixed(1)) : 0;
    const userAcceptanceRate = uniqueUsers.size > 0
      ? parseFloat(((uniqueAcceptedUsers.size / uniqueUsers.size) * 100).toFixed(1))
      : 0;

    // Build 5 runtime histogram buckets
    let runtimeBuckets = [];
    if (acceptedRuntimes.length > 0) {
      acceptedRuntimes.sort((a, b) => a - b);
      const minR = acceptedRuntimes[0];
      const maxR = acceptedRuntimes[acceptedRuntimes.length - 1];

      // Clean interval bounds
      const lower = Math.max(0, Math.floor(minR / 10) * 10);
      const upper = Math.max(lower + 25, Math.ceil((maxR + 5) / 10) * 10);
      const step = Math.max(1, Math.ceil((upper - lower) / 5));

      for (let i = 0; i < 5; i++) {
        const start = lower + i * step;
        const end = start + step;
        const count = acceptedRuntimes.filter((r) => r >= start && (i === 4 ? r <= end : r < end)).length;
        const percentage = parseFloat(((count / acceptedRuntimes.length) * 100).toFixed(1));
        runtimeBuckets.push({
          label: `${start}-${end}ms`,
          range: [start, end],
          count,
          percentage,
        });
      }
    } else {
      runtimeBuckets = [
        { label: '0-10ms', range: [0, 10], count: 0, percentage: 0 },
        { label: '10-20ms', range: [10, 20], count: 0, percentage: 0 },
        { label: '20-30ms', range: [20, 30], count: 0, percentage: 0 },
        { label: '30-40ms', range: [30, 40], count: 0, percentage: 0 },
        { label: '40-50ms', range: [40, 50], count: 0, percentage: 0 },
      ];
    }

    // Build 5 memory histogram buckets
    let memoryBuckets = [];
    if (acceptedMemories.length > 0) {
      acceptedMemories.sort((a, b) => a - b);
      const minM = acceptedMemories[0];
      const maxM = acceptedMemories[acceptedMemories.length - 1];

      const lowerM = Math.max(0, Math.floor(minM / 5) * 5);
      const upperM = Math.max(lowerM + 15, Math.ceil((maxM + 2) / 5) * 5);
      const stepM = Math.max(1, Math.round((upperM - lowerM) / 5));

      for (let i = 0; i < 5; i++) {
        const start = lowerM + i * stepM;
        const end = start + stepM;
        const count = acceptedMemories.filter((m) => m >= start && (i === 4 ? m <= end : m < end)).length;
        const percentage = parseFloat(((count / acceptedMemories.length) * 100).toFixed(1));
        memoryBuckets.push({
          label: `${start}-${end}MB`,
          range: [start, end],
          count,
          percentage,
        });
      }
    } else {
      memoryBuckets = [
        { label: '0-10MB', range: [0, 10], count: 0, percentage: 0 },
        { label: '10-20MB', range: [10, 20], count: 0, percentage: 0 },
        { label: '20-30MB', range: [20, 30], count: 0, percentage: 0 },
        { label: '30-40MB', range: [30, 40], count: 0, percentage: 0 },
        { label: '40-50MB', range: [40, 50], count: 0, percentage: 0 },
      ];
    }

    res.status(200).json({
      status: 'success',
      data: {
        totalSubmissions: total,
        acceptedSubmissions: accepted,
        acceptanceRate,
        userAcceptanceRate,
        totalUsers: uniqueUsers.size,
        acceptedUsers: uniqueAcceptedUsers.size,
        verdictCounts: {
          accepted,
          wrongAnswer,
          timeLimit,
          runtimeError,
          compileError,
          other,
        },
        runtimeBuckets,
        memoryBuckets,
        acceptedRuntimes,
        acceptedMemories,
      },
    });
  } catch (error) {
    console.error('🔥 getProblemStats error:', error.message);
    res.status(500).json({ message: error.message });
  }
};