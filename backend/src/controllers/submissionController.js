const Submission = require('../models/Submission');
const Problem = require('../models/Problem');
const User = require('../models/Users');
const mongoose = require('mongoose');
const jdoodleService = require('../services/jdoodleService');

// Helper for pagination
const getPagination = (page, limit) => {
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  const skip = (pageNum - 1) * limitNum;
  return { page: pageNum, limit: limitNum, skip };
};

// @desc    Create a new submission
// @route   POST /api/submissions
// @access  Private

exports.createSubmission = async (req, res) => {
  try {
    const { problemId, language, code } = req.body;

    if (!problemId || !language || !code) {
      return res.status(400).json({
        message: 'Please provide problemId, language, and code',
      });
    }

    // 1. Validate problem exists and fetch hidden test cases
    const problem = await Problem.findById(problemId).select('+hiddenTestCases');
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    // 2. Validate language support for JDoodle
    const supportedLanguages = ['cpp', 'java', 'python', 'javascript', 'c'];
    if (!supportedLanguages.includes(language)) {
      return res.status(400).json({ message: `Language "${language}" is not supported` });
    }

    // 3. Create initial submission record (status: pending)
    const submission = await Submission.create({
      user: req.user._id,
      problem: problemId,
      language,
      code,
      status: 'pending',
      passedTestCases: 0,
      totalTestCases: problem.hiddenTestCases.length,
    });

    // 4. Run code against hidden test cases via JDoodle
    try {
      const testCases = problem.hiddenTestCases.map((tc) => ({
        input: tc.input,
        output: tc.output,
      }));

      // Pass the language string (e.g., 'cpp'), NOT an ID
      const result = await jdoodleService.runAllTestCases(
        code,
        language,   // <-- language string
        testCases,
        problem.timeLimit
      );

      // 5. Update submission with results
      submission.status = result.status;
      submission.runtime = result.runtime;
      submission.memory = result.memory;
      submission.passedTestCases = result.passed;
      submission.totalTestCases = result.total;
      await submission.save();

      // 6. If accepted, add problem to user's solved list
      if (result.status === 'accepted') {
        await User.findByIdAndUpdate(
          req.user._id,
          { $addToSet: { solvedProblems: problemId } },
          { new: true }
        );
      }

      // 7. Return final submission
      return res.status(201).json({
        status: 'success',
        submission,
      });
    } catch (execError) {
      // If JDoodle fails, mark submission as runtime_error
      submission.status = 'runtime_error';
      submission.runtime = null;
      submission.memory = null;
      await submission.save();

      return res.status(500).json({
        message: 'Code execution failed: ' + execError.message,
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// @desc    Get logged-in user's submissions
// @route   GET /api/submissions/my
// @access  Private
exports.getMySubmissions = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const { skip, page: pageNum, limit: limitNum } = getPagination(page, limit);

    const [submissions, total] = await Promise.all([
      Submission.find({ user: req.user._id })
        .populate('problem', 'title slug difficulty') // include problem details
        .sort({ submittedAt: -1 })
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
// @access  Private (optional: allow public? we keep private for now)
exports.getProblemSubmissions = async (req, res) => {
  try {
    const { problemId } = req.params;
    const { page = 1, limit = 10, userId } = req.query;

    // Validate problemId
    if (!mongoose.Types.ObjectId.isValid(problemId)) {
      return res.status(400).json({ message: 'Invalid problem ID' });
    }

    // Build filter
    const filter = { problem: problemId };

    // If userId query param is provided and is valid, filter by that user
    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      filter.user = userId;
    } else {
      // If no userId, we may want to show all submissions for this problem.
      // To protect privacy, you might restrict to the authenticated user only.
      // But we'll allow all submissions (since it's a coding platform, leaderboard style).
      // If you want only the current user's submissions, uncomment:
      // filter.user = req.user._id;
    }

    const { skip, page: pageNum, limit: limitNum } = getPagination(page, limit);

    const [submissions, total] = await Promise.all([
      Submission.find(filter)
        .populate('user', 'name email') // show who submitted
        .populate('problem', 'title slug difficulty')
        .sort({ submittedAt: -1 })
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

    const submission = await Submission.findById(id)
      .populate('user', 'name email')
      .populate('problem', 'title slug difficulty description')
      .lean();

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Authorization: only the owner or an admin can view it
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