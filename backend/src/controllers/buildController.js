const mongoose = require('mongoose');
const BuildProblem = require('../models/BuildProblem');
const BuildSubmission = require('../models/BuildSubmission');
const Contest = require('../models/Contest');
const ContestParticipant = require('../models/ContestParticipant');
const { buildQueue, addBuildJob } = require('../queues/buildQueue');
const { validateSubmissionFiles, validateTestCases } = require('../utils/buildValidation');
const { executeDockerFlow } = require('../workers/buildWorker');

/**
 * GET /api/build/problems
 * List problems without test cases
 */
const getBuildProblems = async (req, res) => {
  try {
    const problems = await BuildProblem.find({})
      .select('slug title difficulty runtime limits createdAt visibleTests statement')
      .sort({ createdAt: -1 });

    const formatted = problems.map((p) => {
      const obj = p.toObject();
      const uniqueEndpoints = Array.from(new Set(
        (obj.visibleTests || []).map((t) => `${(t.request?.method || 'GET').toUpperCase()} ${t.request?.path || ''}`)
      ));
      obj.endpointCount = Math.max(uniqueEndpoints.length, 1);
      obj.endpoints = uniqueEndpoints;
      
      const cleanDesc = (obj.statement || '')
        .replace(/#{1,6}\s+[^\n]+/g, '')
        .replace(/`{1,3}[^`]*`{1,3}/g, (m) => m.replace(/`/g, ''))
        .replace(/\r?\n+/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
      obj.summary = cleanDesc.length > 130 ? cleanDesc.substring(0, 130) + '...' : cleanDesc;
      delete obj.visibleTests;
      return obj;
    });

    return res.status(200).json({
      status: 'success',
      count: formatted.length,
      problems: formatted,
    });
  } catch (err) {
    console.error('Error fetching build problems:', err.message);
    return res.status(500).json({ message: 'Server error fetching problems' });
  }
};

/**
 * GET /api/build/problems/:slug
 * Get problem details with starterFiles and visibleTests only (hiddenTests never returned)
 */
const getBuildProblemBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const problem = await BuildProblem.findOne({ slug: slug.toLowerCase() })
      .select('slug title difficulty statement runtime starterFiles visibleTests limits createdAt');

    if (!problem) {
      return res.status(404).json({ message: `Problem with slug "${slug}" not found` });
    }

    return res.status(200).json({
      status: 'success',
      problem,
    });
  } catch (err) {
    console.error('Error fetching problem details:', err.message);
    return res.status(500).json({ message: 'Server error fetching problem details' });
  }
};

/**
 * ADMIN: GET /api/build/admin/problems/:slug
 * Get full problem details including hiddenTests for admin editing
 */
const getAdminBuildProblemBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const problem = await BuildProblem.findOne({ slug: slug.toLowerCase() });

    if (!problem) {
      return res.status(404).json({ message: `Problem with slug "${slug}" not found` });
    }

    return res.status(200).json({
      status: 'success',
      problem,
    });
  } catch (err) {
    console.error('Error fetching admin problem details:', err.message);
    return res.status(500).json({ message: 'Server error fetching problem details' });
  }
};

/**
 * POST /api/build/run
 * POST /api/build/problems/:slug/run
 * Run visible tests against user files in sandbox mode (does not save permanent submission)
 */
const runBuildSolution = async (req, res) => {
  try {
    const slug = req.params.slug || req.body?.slug;

    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({ message: 'Problem slug is required.' });
    }
    const files = req.body?.files;

    // 1. Submit validation (Max 20 files, 200KB total, relative paths only, server.js or index.js required, plain text only)
    const validationError = validateSubmissionFiles(files);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    // 2. Find problem by slug
    const problem = await BuildProblem.findOne({ slug: slug.toLowerCase() })
      .select('slug title visibleTests limits');
    if (!problem) {
      return res.status(404).json({ message: `Problem with slug "${slug}" not found.` });
    }

    if (!problem.visibleTests || problem.visibleTests.length === 0) {
      return res.status(400).json({ message: 'This problem has no visible test cases to run.' });
    }

    // 3. Ephemeral submission object with valid ObjectId for Docker network/container naming
    const ephemeralId = new mongoose.Types.ObjectId();
    const submission = {
      _id: ephemeralId,
      userId: req.user._id,
      problemId: problem._id,
      files,
      status: 'Running',
    };

    const startTime = Date.now();
    let evalResult;

    // Check if Docker daemon is available locally on this machine
    const { checkDockerHealth } = require('../workers/buildWorker');
    const dockerStatus = await checkDockerHealth();

    if (dockerStatus.ok) {
      // Local Docker is available -> execute directly in-process
      evalResult = await executeDockerFlow(submission, problem, { isRun: true });
    } else {
      // Local Docker is NOT available (e.g. on Render) -> delegate to remote worker via BullMQ queue
      const { executeBuildRunViaQueue } = require('../queues/buildQueue');
      const { isBullMQAvailable } = require('../config/bullmqRedis');

      if (isBullMQAvailable()) {
        evalResult = await executeBuildRunViaQueue(submission, problem, 35000);
      } else {
        throw new Error('Docker daemon is offline and cloud execution queue is unavailable.');
      }
    }

    const timeTakenMs = Date.now() - startTime;

    return res.status(200).json({
      status: 'success',
      isRun: true,
      verdict: evalResult.verdict,
      score: evalResult.score,
      passed: evalResult.passed,
      total: evalResult.total,
      message: evalResult.message,
      testResults: evalResult.testResults,
      timeTakenMs,
    });
  } catch (err) {
    console.error('Error running build solution:', err.message);
    const isOffline =
      err.message?.toLowerCase().includes('docker') ||
      err.message?.toLowerCase().includes('sandbox') ||
      err.message?.toLowerCase().includes('queue unavailable') ||
      err.message?.toLowerCase().includes('timeout') ||
      err.message?.includes('ECONNREFUSED') ||
      err.code === 'ECONNREFUSED';
    const statusCode = isOffline ? 503 : 500;
    const message = isOffline
      ? 'The project execution sandbox is temporarily offline or initializing. Please ensure Docker or the build worker is running.'
      : 'Error executing test run: ' + err.message;
    return res.status(statusCode).json({ message, isServiceUnavailable: isOffline });
  }
};

/**
 * POST /api/build/submit
 * Submit files for a build problem
 */
const submitBuildSolution = async (req, res) => {
  try {
    const slug = req.params.slug || req.body?.slug;

    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({ message: 'Problem slug is required.' });
    }
    const files = req.body?.files;

    // 1. Submit validation (Max 20 files, 200KB total, relative paths only, index.js required, plain text only)
    const validationError = validateSubmissionFiles(files);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    // 2. Find problem by slug
    const problem = await BuildProblem.findOne({ slug: slug.toLowerCase() });
    if (!problem) {
      return res.status(404).json({ message: `Problem with slug "${slug}" not found.` });
    }

    // 2b. Contest validation (if contestId is provided)
    const contestId = req.body?.contestId || req.query?.contestId;
    let validatedContest = null;
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
      if (validatedContest.type !== 'api') {
        return res.status(400).json({
          message: 'This contest is a DSA contest. Submissions must be made via /api/submissions.',
        });
      }

      const now = new Date();
      if (now < new Date(validatedContest.startTime)) {
        return res.status(400).json({ message: 'Contest has not started yet.' });
      }
      const isContestEnded = now >= new Date(validatedContest.endTime) || validatedContest.status === 'ended';

      // Check participant (only enforced during live contest; after contest, any user can practice submit)
      if (!isContestEnded) {
        let isParticipant = await ContestParticipant.findOne({
          contestId: validatedContest._id,
          userId: req.user._id,
        });
        if (!isParticipant) {
          if (validatedContest.kind === 'public' || validatedContest.createdBy?.toString() === req.user._id.toString() || req.user.role === 'admin') {
            try {
              await ContestParticipant.create({
                contestId: validatedContest._id,
                userId: req.user._id,
              });
              await Contest.findByIdAndUpdate(validatedContest._id, { $inc: { participantsCount: 1 } });
            } catch (_) {}
          } else {
            return res.status(403).json({
              message: 'You are not a registered participant in this contest.',
            });
          }
        }
      }

      // Check problem belongs to contest
      const belongsToContest = (validatedContest.problems || []).some(
        (p) => p.problemId?.toString() === problem._id.toString()
      );
      if (!belongsToContest) {
        return res.status(400).json({
          message: 'This problem is not part of the specified contest.',
        });
      }

      // One-in-flight rule for API contests
      const inFlight = await BuildSubmission.findOne({
        contestId: validatedContest._id,
        userId: req.user._id,
        status: { $in: ['Queued', 'Running'] },
      });
      if (inFlight) {
        return res.status(429).json({
          message: 'A submission is already in flight for this contest. Please wait for it to complete.',
        });
      }
    }

    // 3. Save as Queued BEFORE adding the job
    const submission = await BuildSubmission.create({
      userId: req.user._id,
      problemId: problem._id,
      contestId: validatedContest ? validatedContest._id : null,
      files,
      status: 'Queued',
    });

    // 4. Add BullMQ job to api-judge queue (with automatic in-process fallback if BullMQ/Redis is offline)
    await addBuildJob(submission._id.toString(), { priority: validatedContest ? 1 : 10 });

    return res.status(202).json({
      status: 'success',
      message: 'Submission queued successfully.',
      submissionId: submission._id,
      submissionStatus: 'Queued',
    });
  } catch (err) {
    console.error('Error creating build submission:', err.message);
    return res.status(500).json({ message: 'Server error creating submission' });
  }
};

/**
 * GET /api/build/submissions/:id
 * Get submission status and results (Owner only, hidden tests must never appear with got)
 */
const getBuildSubmissionById = async (req, res) => {
  try {
    const { id } = req.params;
    const submission = await BuildSubmission.findById(id).populate('problemId', 'title slug');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Owner only check (or admin)
    const isOwner = submission.userId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to view this submission' });
    }

    // Ensure hidden tests never expose 'got'
    const sanitizedTestResults = (submission.testResults || []).map((tr) => {
      if (!tr.visible) {
        return {
          name: tr.name,
          passed: tr.passed,
          visible: false,
        };
      }
      return {
        name: tr.name,
        passed: tr.passed,
        visible: true,
        ...(tr.got ? { got: tr.got } : {}),
      };
    });

    return res.status(200).json({
      status: 'success',
      submission: {
        id: submission._id,
        problem: submission.problemId,
        status: submission.status,
        verdict: submission.status,
        score: submission.score,
        passed: submission.passed,
        total: submission.total,
        message: submission.message,
        testResults: sanitizedTestResults,
        files: submission.files,
        createdAt: submission.createdAt,
      },
    });
  } catch (err) {
    console.error('Error fetching submission details:', err.message);
    return res.status(500).json({ message: 'Server error fetching submission details' });
  }
};

/**
 * GET /api/build/submissions?slug=
 * User's submission history
 */
const getUserBuildSubmissions = async (req, res) => {
  try {
    const { slug } = req.query;
    const query = { userId: req.user._id };

    if (slug) {
      const problem = await BuildProblem.findOne({ slug: slug.toLowerCase() });
      if (problem) {
        query.problemId = problem._id;
      } else {
        return res.status(200).json({ status: 'success', submissions: [] });
      }
    }

    const submissions = await BuildSubmission.find(query)
      .populate('problemId', 'title slug')
      .select('_id problemId status score passed total createdAt')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      status: 'success',
      count: submissions.length,
      submissions,
    });
  } catch (err) {
    console.error('Error fetching submission history:', err.message);
    return res.status(500).json({ message: 'Server error fetching history' });
  }
};

/**
 * ADMIN: POST /api/build/problems
 * Create new build problem with validated test case formats
 */
const createBuildProblem = async (req, res) => {
  try {
    const {
      slug,
      title,
      difficulty,
      statement,
      runtime,
      starterFiles,
      visibleTests,
      hiddenTests,
      limits,
    } = req.body;

    if (!slug || !title || !statement) {
      return res.status(400).json({ message: 'slug, title, and statement are required fields.' });
    }

    // Validate test cases format
    if (visibleTests) {
      const vErr = validateTestCases(visibleTests, 'visibleTests');
      if (vErr) return res.status(400).json({ message: vErr });
    }
    if (hiddenTests) {
      const hErr = validateTestCases(hiddenTests, 'hiddenTests');
      if (hErr) return res.status(400).json({ message: hErr });
    }

    const existing = await BuildProblem.findOne({ slug: slug.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ message: `Problem with slug "${slug}" already exists.` });
    }

    const problem = await BuildProblem.create({
      slug: slug.toLowerCase().trim(),
      title: title.trim(),
      difficulty: difficulty || 'Medium',
      statement,
      runtime: runtime || 'node-express',
      starterFiles: starterFiles || [],
      visibleTests: visibleTests || [],
      hiddenTests: hiddenTests || [],
      limits: limits || { startTimeoutMs: 3000, totalTimeoutMs: 20000 },
    });

    return res.status(201).json({
      status: 'success',
      problem,
    });
  } catch (err) {
    console.error('Error creating build problem:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

/**
 * ADMIN: PUT /api/build/problems/:slug
 * Update build problem
 */
const updateBuildProblem = async (req, res) => {
  try {
    const { slug } = req.params;
    const updateData = { ...req.body };

    if (updateData.visibleTests) {
      const vErr = validateTestCases(updateData.visibleTests, 'visibleTests');
      if (vErr) return res.status(400).json({ message: vErr });
    }
    if (updateData.hiddenTests) {
      const hErr = validateTestCases(updateData.hiddenTests, 'hiddenTests');
      if (hErr) return res.status(400).json({ message: hErr });
    }

    const problem = await BuildProblem.findOneAndUpdate(
      { slug: slug.toLowerCase() },
      updateData,
      { new: true, runValidators: true }
    );

    if (!problem) {
      return res.status(404).json({ message: `Problem with slug "${slug}" not found.` });
    }

    return res.status(200).json({
      status: 'success',
      problem,
    });
  } catch (err) {
    console.error('Error updating build problem:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

/**
 * ADMIN: DELETE /api/build/problems/:slug
 * Delete build problem
 */
const deleteBuildProblem = async (req, res) => {
  try {
    const { slug } = req.params;
    const problem = await BuildProblem.findOneAndDelete({ slug: slug.toLowerCase() });
    if (!problem) {
      return res.status(404).json({ message: `Problem with slug "${slug}" not found.` });
    }
    return res.status(200).json({ status: 'success', message: 'Build problem deleted successfully' });
  } catch (err) {
    console.error('Error deleting build problem:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getBuildProblems,
  getBuildProblemBySlug,
  getAdminBuildProblemBySlug,
  runBuildSolution,
  submitBuildSolution,
  getBuildSubmissionById,
  getUserBuildSubmissions,
  createBuildProblem,
  updateBuildProblem,
  deleteBuildProblem,
};

