const User = require('../models/Users');
const Problem = require('../models/Problem');
const Submission = require('../models/Submission');

// @desc    Get admin dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private/Admin
exports.getDashboardStats = async (req, res) => {
  try {
    // Parallel queries for efficiency
    const [totalUsers, totalProblems, totalSubmissions, acceptedSubmissions, problemsByDifficulty] =
      await Promise.all([
        User.countDocuments(),
        Problem.countDocuments(),
        Submission.countDocuments(),
        Submission.countDocuments({ status: 'accepted' }),
        Problem.aggregate([
          { $group: { _id: '$difficulty', count: { $sum: 1 } } },
        ]),
      ]);

    // Build difficulty object (default 0 if missing)
    const difficultyCounts = { easy: 0, medium: 0, hard: 0 };
    problemsByDifficulty.forEach((item) => {
      if (item._id) difficultyCounts[item._id] = item.count;
    });

    const acceptanceRate = totalSubmissions > 0
      ? ((acceptedSubmissions / totalSubmissions) * 100)
      : 0;

    res.status(200).json({
      status: 'success',
      data: {
        totalUsers,
        totalProblems,
        totalSubmissions,
        acceptedSubmissions,
        acceptanceRate: parseFloat(acceptanceRate.toFixed(2)),
        problems: {
          easy: difficultyCounts.easy,
          medium: difficultyCounts.medium,
          hard: difficultyCounts.hard,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// @desc    Ban a user
// @route   PUT /api/admin/users/:id/ban
// @access  Private/Admin
exports.banUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { reason } = req.body;

    // Prevent self-ban
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot ban yourself' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If already banned, update reason only
    user.isBanned = true;
    user.banReason = reason || 'No reason provided';
    user.bannedAt = new Date();
    await user.save();

    res.status(200).json({
      status: 'success',
      message: `User ${user.name} has been banned`,
      user: { id: user._id, name: user.name, email: user.email, isBanned: user.isBanned, banReason: user.banReason }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Unban a user
// @route   PUT /api/admin/users/:id/unban
// @access  Private/Admin
exports.unbanUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isBanned = false;
    user.banReason = '';
    user.bannedAt = null;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: `User ${user.name} has been unbanned`,
      user: { id: user._id, name: user.name, email: user.email, isBanned: user.isBanned }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};