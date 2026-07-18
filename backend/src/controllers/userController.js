const User = require('../models/Users');
const Submission = require('../models/Submission');
const Problem = require('../models/Problem');
const Login=require('../models/Login')

// @desc    Get user profile with populated solved problems
// @route   GET /api/users/profile
// @access  Private
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('solvedProblems', 'title slug difficulty tags');
    res.status(200).json({ status: 'success', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// @desc    Update user profile (name, avatar)
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { name, avatar } = req.body;
    const userId = req.user._id;

    // Build update object
    const updateData = {};
    if (name) {
      // Check uniqueness (case‑insensitive)
      const existingUser = await User.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: userId },
      });
      if (existingUser) {
        return res.status(400).json({ message: 'Username is already taken' });
      }
      updateData.name = name.trim();
    }
    if (avatar !== undefined) {
      updateData.avatar = avatar; // store as URL or base64 string
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      status: 'success',
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private
exports.getUserStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // Total submissions
    const totalSubmissions = await Submission.countDocuments({ user: userId });

    // Accepted submissions
    const acceptedSubmissions = await Submission.countDocuments({ user: userId, status: 'accepted' });

    // Acceptance rate (avoid division by zero)
    const acceptanceRate = totalSubmissions > 0 ? (acceptedSubmissions / totalSubmissions) * 100 : 0;

    // Count solved by difficulty
    const user = await User.findById(userId).populate('solvedProblems', 'difficulty');
    const difficultyCount = { easy: 0, medium: 0, hard: 0 };
    user.solvedProblems.forEach(p => {
      if (p.difficulty === 'easy') difficultyCount.easy++;
      else if (p.difficulty === 'medium') difficultyCount.medium++;
      else if (p.difficulty === 'hard') difficultyCount.hard++;
    });

    res.status(200).json({
      status: 'success',
      stats: {
        totalSubmissions,
        acceptedSubmissions,
        acceptanceRate: parseFloat(acceptanceRate.toFixed(2)),
        solved: {
          easy: difficultyCount.easy,
          medium: difficultyCount.medium,
          hard: difficultyCount.hard,
          total: user.solvedProblems.length,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get problems the user has attempted (submitted at least once)
// @route   GET /api/users/attempted
// @access  Private
exports.getAttemptedProblems = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get distinct problem IDs from submissions
    const attemptedIds = await Submission.distinct('problem', { user: userId });

    // Populate problem details
    const problems = await Problem.find({ _id: { $in: attemptedIds } })
      .select('title slug difficulty tags');

    res.status(200).json({
      status: 'success',
      count: problems.length,
      problems,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// @desc    Get summary of user's submissions per problem
// @route   GET /api/users/problems/summary
// @access  Private
exports.getProblemSubmissionSummary = async (req, res) => {
  try {
    const userId = req.user._id;

    // Aggregate submissions per problem
    const summary = await Submission.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: '$problem',
          totalAttempts: { $sum: 1 },
          acceptedAttempts: {
            $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] },
          },
          lastSubmittedAt: { $max: '$submittedAt' },
        },
      },
    ]);

    // Populate problem details (title, slug, difficulty)
    const problemIds = summary.map((item) => item._id);
    const problems = await Problem.find({ _id: { $in: problemIds } })
      .select('title slug difficulty');

    // Map problem details into summary
    const result = summary.map((item) => {
      const problem = problems.find((p) => p._id.toString() === item._id.toString());
      return {
        problemId: item._id,
        title: problem ? problem.title : 'Unknown',
        slug: problem ? problem.slug : '',
        difficulty: problem ? problem.difficulty : 'unknown',
        totalAttempts: item.totalAttempts,
        acceptedAttempts: item.acceptedAttempts,
        lastSubmittedAt: item.lastSubmittedAt,
      };
    });

    res.status(200).json({
      status: 'success',
      count: result.length,
      summary: result,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// @desc    Get recent user activity (submissions)
// @route   GET /api/users/activity
// @access  Private
exports.getRecentActivity = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);

    const submissions = await Submission.find({ user: req.user._id })
      .sort({ submittedAt: -1 })
      .limit(limitNum)
      .populate('problem', 'title slug difficulty')
      .lean();

    const activities = submissions.map((sub) => ({
      type: 'submission',
      id: sub._id,                 // <-- use this to fetch full details
      problem: sub.problem,
      language: sub.language,
      status: sub.status,
      runtime: sub.runtime,
      memory: sub.memory,
      passedTestCases: sub.passedTestCases,
      totalTestCases: sub.totalTestCases,
      submittedAt: sub.submittedAt,
      // code is omitted – fetch via /api/submissions/:id on click
    }));

    res.status(200).json({
      status: 'success',
      count: activities.length,
      activities,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// @desc    Bookmark a problem
// @route   POST /api/problems/:id/bookmark
// @access  Private
exports.bookmarkProblem = async (req, res) => {
  try {
    const problemId = req.params.id;
    const userId = req.user._id;

    // Check if problem exists
    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    // Add to bookmarks (prevent duplicates)
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { bookmarkedProblems: problemId } },
      { new: true }
    ).populate('bookmarkedProblems', 'title slug difficulty tags');

    res.status(200).json({
      status: 'success',
      message: 'Problem bookmarked successfully',
      bookmarks: updatedUser.bookmarkedProblems,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remove bookmark from a problem
// @route   DELETE /api/problems/:id/bookmark
// @access  Private
exports.removeBookmark = async (req, res) => {
  try {
    const problemId = req.params.id;
    const userId = req.user._id;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $pull: { bookmarkedProblems: problemId } },
      { new: true }
    ).populate('bookmarkedProblems', 'title slug difficulty tags');

    res.status(200).json({
      status: 'success',
      message: 'Bookmark removed successfully',
      bookmarks: updatedUser.bookmarkedProblems,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all bookmarked problems for logged-in user
// @route   GET /api/users/bookmarks
// @access  Private
exports.getBookmarks = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('bookmarkedProblems', 'title slug difficulty tags sampleTestCases');

    res.status(200).json({
      status: 'success',
      count: user.bookmarkedProblems.length,
      bookmarks: user.bookmarkedProblems,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// GET /api/users/login-activity – returns list of dates (YYYY-MM-DD)
exports.getLoginActivity = async (req, res) => {
  try {
    const userId = req.user._id;
    const logins = await Login.find({
      user: userId,
      loggedAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
    }).select('loggedAt -_id');

    const dates = logins.map(l => l.loggedAt.toISOString().split('T')[0]);
    res.status(200).json({ status: 'success', data: dates });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// @desc    Get user's streak (current and max)
// @route   GET /api/users/streak
// @access  Private
exports.getUserStreak = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all submission dates (distinct) for this user
    const submissions = await Submission.find({ user: userId })
      .select('submittedAt')
      .sort({ submittedAt: 1 }); // oldest first

    if (!submissions.length) {
      return res.status(200).json({
        status: 'success',
        data: { currentStreak: 0, maxStreak: 0 },
      });
    }

    // Extract unique dates (YYYY-MM-DD)
    const dates = submissions.map(s => s.submittedAt.toISOString().split('T')[0]);
    const uniqueDates = [...new Set(dates)].sort();

    let maxStreak = 0;
    let streak = 0;
    let prevDate = null;

    // 1. Compute Max Streak (Go through dates from oldest to newest)
    for (const dateStr of uniqueDates) {
      const current = new Date(dateStr);
      if (prevDate === null) {
        streak = 1;
      } else {
        const diff = (current - prevDate) / (1000 * 60 * 60 * 24);
        // Using Math.round to protect against floating-point daylight savings gaps
        if (Math.round(diff) === 1) {
          streak++;
        } else if (Math.round(diff) > 1) {
          streak = 1;
        }
      }
      prevDate = current;
      maxStreak = Math.max(maxStreak, streak);
    }

    // 2. Compute Current Streak dynamically with a rolling look-back
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Determine starting checkpoint date for our backward scan
    let checkDate;
    if (uniqueDates.includes(todayStr)) {
      checkDate = new Date(today);
    } else if (uniqueDates.includes(yesterdayStr)) {
      checkDate = new Date(yesterday);
    } else {
      checkDate = null; // Streak has fully broken (no submissions today or yesterday)
    }

    let currentStreak = 0;
    if (checkDate) {
      for (let i = 0; i < 365; i++) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (uniqueDates.includes(dateStr)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break; // Hit a missing link in the chain
        }
      }
    }

    // Safeguard maxStreak parameter to ensure it never falls behind current calculations
    if (currentStreak > maxStreak) {
      maxStreak = currentStreak;
    }

    // Return exact signature expected by front-end framework
    return res.status(200).json({
      status: 'success',
      data: { currentStreak, maxStreak },
    });
  } catch (error) {
    return res.status(500).json({ status: 'fail', message: error.message });
  }
};