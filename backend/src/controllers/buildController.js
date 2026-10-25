const BuildProblem = require('../models/BuildProblem');
const BuildSubmission = require('../models/BuildSubmission');
const { buildQueue } = require('../queues/buildQueue');
const { validateSubmissionFiles, validateTestCases } = require('../utils/buildValidation');

/**
 * GET /api/build/problems
 * List problems without test cases
 */
const getBuildProblems = async (req, res) => {
  try {
    const problems = await BuildProblem.find({})
      .select('slug title difficulty runtime limits createdAt')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      status: 'success',
      count: problems.length,
      problems,
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

    // 3. Save as Queued BEFORE adding the job
    const submission = await BuildSubmission.create({
      userId: req.user._id,
      problemId: problem._id,
      files,
      status: 'Queued',
    });

    // 4. Add BullMQ job to api-judge queue
    await buildQueue.add('evaluate-submission', {
      submissionId: submission._id.toString(),
    });

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

module.exports = {
  getBuildProblems,
  getBuildProblemBySlug,
  submitBuildSolution,
  getBuildSubmissionById,
  getUserBuildSubmissions,
  createBuildProblem,
  updateBuildProblem,
};
