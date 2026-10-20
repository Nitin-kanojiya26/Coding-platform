const User = require('../models/Users');
const Submission = require('../models/Submission');
const redis = require('../config/redis');

// @desc    Get platform leaderboard
// @route   GET /api/leaderboard
// @access  Public (or Private - your choice)
exports.getLeaderboard = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    // Check Redis cache first
    const cacheKey = `leaderboard:${pageNum}:${limitNum}`;
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    // Aggregate user stats
    const pipeline = [
      // Group submissions by user
      {
        $group: {
          _id: '$user',
          totalSubmissions: { $sum: 1 },
          acceptedSubmissions: {
            $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] },
          },
        },
      },
      // Lookup user details
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      // Calculate acceptance rate
      {
        $addFields: {
          acceptanceRate: {
            $cond: [
              { $eq: ['$totalSubmissions', 0] },
              0,
              { $multiply: [{ $divide: ['$acceptedSubmissions', '$totalSubmissions'] }, 100] },
            ],
          },
          problemsSolved: { $size: '$user.solvedProblems' },
        },
      },
      // Filter out users with 0 submissions (optional)
      // { $match: { totalSubmissions: { $gt: 0 } } },
      // Sort by accepted submissions DESC, then by acceptance rate
      { $sort: { acceptedSubmissions: -1, acceptanceRate: -1 } },
      // Pagination
      { $skip: skip },
      { $limit: limitNum },
      // Project final fields
      {
        $project: {
          userId: '$_id',
          username: '$user.name',
          email: '$user.email',
          avatar: '$user.avatar',
          problemsSolved: 1,
          totalSubmissions: 1,
          acceptedSubmissions: 1,
          acceptanceRate: { $round: ['$acceptanceRate', 2] },
        },
      },
    ];

    const [leaderboard, totalUsers] = await Promise.all([
      Submission.aggregate(pipeline),
      // Count users with at least one submission (optional)
      Submission.distinct('user').then((users) => users.length),
    ]);

    // Add rank
    const rankedLeaderboard = leaderboard.map((user, index) => ({
      rank: skip + index + 1,
      ...user,
    }));

    const responsePayload = {
      status: 'success',
      page: pageNum,
      limit: limitNum,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limitNum),
      count: rankedLeaderboard.length,
      leaderboard: rankedLeaderboard,
    };

    // Store in Redis with 60s TTL
    await redis.setex(cacheKey, 60, JSON.stringify(responsePayload));

    res.status(200).json(responsePayload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};