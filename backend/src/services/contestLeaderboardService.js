const mongoose = require('mongoose');
const Contest = require('../models/Contest');
const ContestParticipant = require('../models/ContestParticipant');
const ContestStanding = require('../models/ContestStanding');
const User = require('../models/Users');
const Submission = require('../models/Submission');
const BuildSubmission = require('../models/BuildSubmission');
const redisClient = require('../config/redis');
const { computeStanding } = require('./contestScoringService');

const LEADERBOARD_KEY_PREFIX = 'contest';
const SEVEN_DAYS_SECONDS = 7 * 24 * 3600;

/**
 * Update standing for a single participant in a contest.
 * Runs computeStanding, updates ContestStanding in MongoDB, and syncs Redis sorted set.
 */
async function updateUserContestStanding(contestId, userId) {
  const contest = await Contest.findById(contestId);
  if (!contest) {
    throw new Error(`Contest ${contestId} not found.`);
  }

  const user = await User.findById(userId).select('name username');
  if (!user) {
    throw new Error(`User ${userId} not found.`);
  }

  // Fetch all user submissions for this contest in chronological order
  let submissions = [];
  if (contest.type === 'dsa') {
    submissions = await Submission.find({
      contestId: contest._id,
      user: user._id,
    }).sort({ createdAt: 1 });
  } else {
    submissions = await BuildSubmission.find({
      contestId: contest._id,
      userId: user._id,
    }).sort({ createdAt: 1 });
  }

  // Pure scoring calculation
  const standingData = computeStanding(submissions, contest, user);

  // Persist to MongoDB
  const standingDoc = await ContestStanding.findOneAndUpdate(
    { contestId: contest._id, userId: user._id },
    { $set: standingData },
    { upsert: true, returnDocument: 'after' }
  );

  // Update Redis cache & sorted set
  if (redisClient.isConnected) {
    try {
      const lbKey = `${LEADERBOARD_KEY_PREFIX}:${contestId}:lb`;
      const userKey = `${LEADERBOARD_KEY_PREFIX}:${contestId}:user:${userId}`;

      const multi = redisClient.multi();
      multi.zadd(lbKey, standingData.composite, userId.toString());
      multi.hset(userKey, 'data', JSON.stringify(standingDoc));
      multi.expire(lbKey, SEVEN_DAYS_SECONDS);
      multi.expire(userKey, SEVEN_DAYS_SECONDS);
      await multi.exec();
    } catch (err) {
 console.warn(` [RedisLeaderboard] Failed to update Redis cache:`, err.message);
    }
  }

  // Emit real-time WebSocket broadcast to all connected contest room viewers
  try {
    const { emitStandingsUpdate } = require('../sockets/contestSocket');
    emitStandingsUpdate(contestId, {
      userId,
      standing: standingDoc,
    });
  } catch (_) {}

  return standingDoc;
}

/**
 * Rebuilds the entire Redis sorted set from MongoDB ContestStanding documents.
 */
async function rebuildLeaderboard(contestId) {
  const standings = await ContestStanding.find({ contestId })
    .sort({ composite: -1 });

  if (redisClient.isConnected && standings.length > 0) {
    try {
      const lbKey = `${LEADERBOARD_KEY_PREFIX}:${contestId}:lb`;
      const multi = redisClient.multi();
      multi.del(lbKey);

      for (const st of standings) {
        multi.zadd(lbKey, st.composite, st.userId.toString());
        const userKey = `${LEADERBOARD_KEY_PREFIX}:${contestId}:user:${st.userId}`;
        multi.hset(userKey, 'data', JSON.stringify(st));
        multi.expire(userKey, SEVEN_DAYS_SECONDS);
      }
      multi.expire(lbKey, SEVEN_DAYS_SECONDS);
      await multi.exec();
    } catch (err) {
 console.warn(` [RedisLeaderboard] Error rebuilding leaderboard in Redis:`, err.message);
    }
  }

  return standings;
}

const contestSyncLocks = new Set();

async function syncMissingStandings(contest) {
  const cId = contest._id.toString();
  if (contestSyncLocks.has(cId)) return;
  contestSyncLocks.add(cId);

  try {
    const isDsa = contest.type === 'dsa';
    const submitterIds = isDsa
      ? await Submission.find({ contestId: contest._id }).distinct('user')
      : await BuildSubmission.find({ contestId: contest._id }).distinct('userId');

    const participantIds = await ContestParticipant.find({ contestId: contest._id }).distinct('userId');

    const allUserIds = [...new Set([
      ...submitterIds.filter(Boolean).map((id) => id.toString()),
      ...participantIds.filter(Boolean).map((id) => id.toString()),
    ])];

    if (allUserIds.length > 0) {
      const existingStandingUserIds = new Set(
        (await ContestStanding.find({ contestId: contest._id }).select('userId'))
          .map((s) => s.userId?.toString())
      );

      const missingUserIds = allUserIds.filter((uid) => !existingStandingUserIds.has(uid));
      for (let i = 0; i < missingUserIds.length; i += 10) {
        const batch = missingUserIds.slice(i, i + 10);
        await Promise.allSettled(batch.map((uid) => updateUserContestStanding(contest._id, uid)));
      }
    }
  } catch (syncErr) {
 console.warn(` [LeaderboardSync] Error during standing verification:`, syncErr.message);
  } finally {
    contestSyncLocks.delete(cId);
  }
}

/**
 * Fetch paginated contest standings with rankings.
 * Automatically synchronizes standings for any registered or submitting participant so leaderboard is always accurate.
 */
async function getContestLeaderboard(contestId, { page = 1, limit = 50, bypassCache = false } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const skip = (pageNum - 1) * limitNum;
  const cacheKey = `contest:${contestId}:leaderboard:${pageNum}:${limitNum}`;

  const { getMongoQueryCount } = require('../config/db');
  const startQueries = getMongoQueryCount();
  let lockWaitTimeMs = 0;

  // Check Redis micro-cache (2s TTL) unless explicitly bypassed
  if (!bypassCache) {
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
        return {
          ...parsed,
          _telemetry: {
            cacheHit: true,
            lockWaitTimeMs: 0,
            mongoQueries: 0,
          },
        };
      }
    } catch (_) {}
  }

  const contest = await Contest.findById(contestId);
  if (!contest) {
    return null;
  }

  // Check if any standings exist; if empty, await sync once and measure lock wait time.
  const standingCount = await ContestStanding.countDocuments({ contestId });
  if (standingCount === 0) {
    const lockWaitStart = Date.now();
    await syncMissingStandings(contest);
    lockWaitTimeMs = Date.now() - lockWaitStart;
  } else {
    syncMissingStandings(contest).catch(() => {});
  }

  const totalParticipants = await ContestStanding.countDocuments({ contestId });

  // MongoDB query as reliable source of truth
  const standings = await ContestStanding.find({ contestId })
    .sort({ composite: -1 })
    .skip(skip)
    .limit(limitNum);

  // If Redis is online and empty, trigger non-blocking rebuild
  if (redisClient.isConnected && standings.length > 0) {
    const lbKey = `${LEADERBOARD_KEY_PREFIX}:${contestId}:lb`;
    redisClient.zcard(lbKey).then((card) => {
      if (!card || card === 0) {
        rebuildLeaderboard(contestId).catch(() => {});
      }
    }).catch(() => {});
  }

  // Format response with explicit 1-indexed rank and robust user display properties
  const ranked = standings.map((st, idx) => ({
    rank: skip + idx + 1,
    userId: st.userId,
    userName: st.displayName,
    name: st.displayName,
    displayName: st.displayName,
    solvedCount: st.solvedCount || 0,
    totalPoints: st.totalPoints || 0,
    penaltySeconds: st.penaltySeconds || 0,
    penaltyMinutes: Math.floor((st.penaltySeconds || 0) / 60),
    lastAcceptSeconds: st.lastAcceptSeconds,
    oldRating: st.oldRating ?? 1500,
    newRating: st.newRating ?? 1500,
    ratingDelta: contest.ratingsCalculatedAt ? (st.ratingDelta ?? 0) : null,
    ratingBadge: st.ratingBadge || 'Contender',
    perProblem: st.perProblem,
    updatedAt: st.updatedAt,
  }));

  const endQueries = getMongoQueryCount();
  const telemetry = {
    cacheHit: false,
    lockWaitTimeMs,
    mongoQueries: Math.max(0, endQueries - startQueries),
  };

  const result = {
    contestId,
    totalParticipants,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(totalParticipants / limitNum),
    ratingsCalculated: !!contest.ratingsCalculatedAt,
    ratingsCalculatedAt: contest.ratingsCalculatedAt,
    standings: ranked,
    _telemetry: telemetry,
  };

  if (!bypassCache) {
    try {
      await redisClient.setex(cacheKey, 2, JSON.stringify(result));
    } catch (_) {}
  }

  return result;
}

/**
 * Compute aggregate statistics for a contest.
 */
async function getContestStats(contestId) {
  const contest = await Contest.findById(contestId);
  if (!contest) {
    throw new Error(`Contest ${contestId} not found.`);
  }

  const isDsa = contest.type === 'dsa';
  const totalRegistered = await ContestParticipant.countDocuments({ contestId });

  let totalSubmissions = 0;
  let allSubmissions = [];

  if (isDsa) {
    totalSubmissions = await Submission.countDocuments({ contestId });
    allSubmissions = await Submission.find({ contestId }).select('problem status createdAt');
  } else {
    totalSubmissions = await BuildSubmission.countDocuments({ contestId });
    allSubmissions = await BuildSubmission.find({ contestId }).select('problemId status createdAt');
  }

  // Problem-by-problem acceptance rate
  const problems = Array.isArray(contest.problems) ? contest.problems : [];
  const problemStats = problems.map((p) => {
    const pIdStr = p.problemId?.toString();
    const subsForProb = allSubmissions.filter((s) => {
      const sId = (s.problemId || s.problem)?.toString();
      return sId === pIdStr;
    });

    const acceptedCount = subsForProb.filter((s) => {
      const st = (s.status || '').toLowerCase();
      return st === 'accepted' || st === 'pass';
    }).length;

    const totalAttempts = subsForProb.length;
    const acceptanceRate = totalAttempts > 0 ? Math.round((acceptedCount / totalAttempts) * 100) : 0;

    return {
      problemId: p.problemId,
      label: p.label,
      points: p.points,
      totalAttempts,
      acceptedCount,
      acceptanceRate,
    };
  });

  return {
    contestId: contest._id,
    type: contest.type,
    scoring: contest.scoring,
    totalParticipants: totalRegistered,
    totalSubmissions,
    problemStats,
  };
}

module.exports = {
  updateUserContestStanding,
  rebuildLeaderboard,
  getContestLeaderboard,
  getContestStats,
};
