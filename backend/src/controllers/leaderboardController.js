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
    const useCache = process.env.USE_CACHE !== 'false';
    const cacheKey = `leaderboard:${pageNum}:${limitNum}`;

    // 1. Check Redis cache if caching is enabled
    if (useCache) {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        return res.status(200).json({
          ...JSON.parse(cachedData),
          source: 'cache'
        });
      }
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
      source: 'database',
      page: pageNum,
      limit: limitNum,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limitNum),
      count: rankedLeaderboard.length,
      leaderboard: rankedLeaderboard,
    };

    // 2. Store in Redis with 60s TTL if caching is enabled
    if (useCache) {
      await redis.setex(cacheKey, 60, JSON.stringify(responsePayload));
    }

    res.status(200).json(responsePayload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get platform contest rating leaderboard (LeetCode-style rankings)
 * @route   GET /api/leaderboard/contest
 * @access  Public / Private
 */
exports.getContestRatingLeaderboard = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (pageNum - 1) * limitNum;
    const useCache = process.env.USE_CACHE !== 'false';
    const cacheKey = `leaderboard:contest:${pageNum}:${limitNum}`;

    if (useCache) {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        return res.status(200).json({
          ...JSON.parse(cachedData),
          source: 'cache',
        });
      }
    }

    // Filter to users who have attended at least 1 contest, or all users if none have attended yet
    let count = await User.countDocuments({ contestsAttended: { $gt: 0 } });
    let query = { contestsAttended: { $gt: 0 } };
    if (count === 0) {
      count = await User.countDocuments({});
      query = {};
    }

    const users = await User.find(query)
      .sort({ contestRating: -1, contestsAttended: -1, updatedAt: 1 })
      .skip(skip)
      .limit(limitNum)
      .select('name avatar role contestRating ratingBadge contestsAttended globalContestRank solvedProblems');

    const ranked = users.map((u, idx) => ({
      rank: skip + idx + 1,
      userId: u._id,
      _id: u._id,
      name: u.name,
      username: u.name,
      avatar: u.avatar,
      role: u.role,
      contestRating: u.contestRating || 1500,
      ratingBadge: u.ratingBadge || 'Contender',
      contestsAttended: u.contestsAttended || 0,
      globalContestRank: u.globalContestRank || (skip + idx + 1),
      problemsSolved: Array.isArray(u.solvedProblems) ? u.solvedProblems.length : 0,
    }));

    const responsePayload = {
      status: 'success',
      source: 'database',
      page: pageNum,
      limit: limitNum,
      totalUsers: count,
      totalPages: Math.ceil(count / limitNum),
      count: ranked.length,
      leaderboard: ranked,
    };

    if (useCache) {
      await redis.setex(cacheKey, 60, JSON.stringify(responsePayload));
    }

    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Error fetching contest rating leaderboard:', error);
    return res.status(500).json({ message: error.message });
  }
};