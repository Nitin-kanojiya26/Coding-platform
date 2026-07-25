const Submission = require('../models/Submission');
const Problem = require('../models/Problem');
const User = require('../models/Users');
const mongoose = require('mongoose');
const judge0Service = require('../services/judge0Service');
const languageMap = require('../utils/languageMap');

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
  if (languageMap[normalized]) {
    return languageMap[normalized];
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
    'c': 50          // C (GCC 9.2.0)
  };

  return fallbackMap[normalized] || null;
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
      language,
      code,
      status: 'pending',
      passedTestCases: 0,
      totalTestCases: testCasesToRun.length,
    });

    // 4. Run code against hidden test cases via Judge0
    try {
      const testCases = testCasesToRun.map((tc) => ({
        input: tc.input || '',
        output: tc.output || '',
      }));

      const result = await judge0Service.runAllTestCases(
        code,
        languageId,
        testCases,
        problem.timeLimit || 2000
      );

      // 5. Update submission record with execution results
      submission.status = result.status;
      submission.runtime = result.runtime;
      submission.memory = result.memory;
      submission.passedTestCases = result.passed;
      submission.totalTestCases = result.total;
      if (result.compile_output || result.stderr) {
        submission.errorLog = result.compile_output || result.stderr;
      }
      await submission.save();

      // 6. If accepted, add problem to user's solved list
      if (result.status === 'accepted') {
        await User.findByIdAndUpdate(
          req.user._id,
          { $addToSet: { solvedProblems: problemId } },
          { new: true }
        );
      }

      // 7. Return final response
      return res.status(201).json({
        status: 'success',
        submission,
      });
    } catch (execError) {
      console.error('❌ Judge0 execution error during submission:', execError.message);

      // Mark submission as internal error / execution failure
      submission.status = 'execution_error';
      submission.runtime = null;
      submission.memory = null;
      await submission.save();

      return res.status(500).json({
        message: 'Code execution failed: ' + execError.message,
      });
    }
  } catch (error) {
    console.error('🔥 createSubmission controller error:', error.message);
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

    const submission = await Submission.findById(id)
      .populate('user', 'name email')
      .populate('problem', 'title slug difficulty description')
      .lean();

    if (!submission) {
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