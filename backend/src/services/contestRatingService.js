const mongoose = require('mongoose');
const User = require('../models/Users');
const Contest = require('../models/Contest');
const ContestStanding = require('../models/ContestStanding');
const ContestRatingHistory = require('../models/ContestRatingHistory');

/**
 * Determine user rating tier and styling badge (LeetCode inspired tiers)
 */
function getRatingBadge(rating = 1500) {
  const r = Math.round(rating);
  if (r >= 2150) {
    return {
      tier: 'Guardian',
      label: 'Guardian',
      color: '#ef4444', // Red
      badgeBg: 'rgba(239, 68, 68, 0.12)',
      badgeBorder: 'rgba(239, 68, 68, 0.3)',
    };
  }
  if (r >= 1850) {
    return {
      tier: 'Knight',
      label: 'Knight',
      color: '#f59e0b', // Amber / Gold
      badgeBg: 'rgba(245, 158, 11, 0.12)',
      badgeBorder: 'rgba(245, 158, 11, 0.3)',
    };
  }
  if (r >= 1650) {
    return {
      tier: 'Expert',
      label: 'Expert',
      color: '#a855f7', // Purple
      badgeBg: 'rgba(168, 85, 247, 0.12)',
      badgeBorder: 'rgba(168, 85, 247, 0.3)',
    };
  }
  if (r >= 1500) {
    return {
      tier: 'Specialist',
      label: 'Specialist',
      color: '#3b82f6', // Blue
      badgeBg: 'rgba(59, 130, 246, 0.12)',
      badgeBorder: 'rgba(59, 130, 246, 0.3)',
    };
  }
  return {
    tier: 'Contender',
    label: 'Contender',
    color: '#71717a', // Zinc
    badgeBg: 'rgba(113, 113, 122, 0.12)',
    badgeBorder: 'rgba(113, 113, 122, 0.3)',
  };
}

/**
 * Pure probability that player B with rating rB outperforms player A with rating rA
 */
function eloProbability(rA, rB) {
  return 1 / (1 + Math.pow(10, (rA - rB) / 400));
}

/**
 * Pure calculation of expected rank (Seed) of player with rating r among all other players
 */
function calculateSeed(r, otherRatings) {
  let seed = 1;
  for (let i = 0; i < otherRatings.length; i++) {
    seed += eloProbability(r, otherRatings[i]);
  }
  return seed;
}

/**
 * Binary search to find rating R such that calculateSeed(R, otherRatings) == targetRank
 */
function findPerformanceRating(targetRank, otherRatings) {
  let low = 1;
  let high = 4000;

  for (let iter = 0; iter < 45; iter++) {
    const mid = (low + high) / 2;
    const seed = calculateSeed(mid, otherRatings);
    if (seed < targetRank) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return (low + high) / 2;
}

/**
 * Pure LeetCode-style rating change engine
 * Deterministic, side-effect free, testable with unit tests.
 *
 * @param {Array} contestants - [{ userId, currentRating, rank, solvedCount, penaltySeconds }]
 * @returns {Array} - [{ userId, oldRating, newRating, delta, ratingBadge, performance }]
 */
function computeRatingChanges(contestants = []) {
  if (!Array.isArray(contestants) || contestants.length === 0) {
    return [];
  }

  const n = contestants.length;

  // Single participant special case
  if (n === 1) {
    const c = contestants[0];
    const oldR = Math.max(100, Math.round(c.currentRating || 1500));
    const delta = c.solvedCount > 0 ? 15 : 0;
    const newR = oldR + delta;
    return [{
      userId: c.userId,
      oldRating: oldR,
      newRating: newR,
      delta,
      ratingBadge: getRatingBadge(newR).label,
      performance: oldR + delta,
    }];
  }

  const ratings = contestants.map((c) => Math.max(100, Number(c.currentRating) || 1500));
  const rawResults = [];

  for (let i = 0; i < n; i++) {
    const c = contestants[i];
    const oldR = ratings[i];
    const otherRatings = ratings.filter((_, idx) => idx !== i);

    // Expected rank (Seed)
    const seed = calculateSeed(oldR, otherRatings);

    // Geometric mean of actual rank and expected rank
    const actualRank = Math.max(1, Number(c.rank) || (i + 1));
    const targetRank = Math.sqrt(actualRank * seed);

    // Performance rating corresponding to targetRank
    const performance = findPerformanceRating(targetRank, otherRatings);

    // Raw delta
    let delta = (performance - oldR) / 2;

    // Dampen if 0 problems solved
    if (c.solvedCount === 0) {
      delta = Math.min(0, delta);
      delta = Math.max(-25, delta);
    }

    // Standard clamping bounds per contest
    delta = Math.max(-100, Math.min(100, delta));

    rawResults.push({
      userId: c.userId,
      oldRating: oldR,
      rawDelta: delta,
      performance: Math.round(performance),
      solvedCount: c.solvedCount || 0,
    });
  }

  // Mean centering to prevent artificial inflation/deflation
  const totalRawDelta = rawResults.reduce((acc, r) => acc + r.rawDelta, 0);
  const inflationAdjustment = totalRawDelta / n;

  return rawResults.map((r) => {
    let finalDelta = Math.round(r.rawDelta - inflationAdjustment);

    // If solved 0 questions, do not allow positive rating gain
    if (r.solvedCount === 0 && finalDelta > 0) {
      finalDelta = 0;
    }

    const newRating = Math.max(100, r.oldRating + finalDelta);
    const badgeInfo = getRatingBadge(newRating);

    return {
      userId: r.userId,
      oldRating: r.oldRating,
      newRating,
      delta: finalDelta,
      ratingBadge: badgeInfo.label,
      performance: r.performance,
    };
  });
}

/**
 * Recompute platform-wide global contest rankings for all users
 */
async function recomputeGlobalRanks() {
  try {
    const users = await User.find({ contestsAttended: { $gt: 0 } })
      .sort({ contestRating: -1, updatedAt: 1 })
      .select('_id contestRating');

    if (users.length === 0) return;

    const bulkOps = users.map((u, idx) => ({
      updateOne: {
        filter: { _id: u._id },
        update: { $set: { globalContestRank: idx + 1 } },
      },
    }));

    await User.bulkWrite(bulkOps);
  } catch (err) {
    console.warn('⚠️ [RatingService] Error recomputing global contest ranks:', err.message);
  }
}

/**
 * Apply contest rating calculations to MongoDB and sync standings & users
 */
async function applyContestRatings(contestId) {
  const contest = await Contest.findById(contestId);
  if (!contest) {
    throw new Error(`Contest ${contestId} not found.`);
  }

  // Fetch verified standings sorted by composite score descending
  const standings = await ContestStanding.find({ contestId })
    .sort({ composite: -1 });

  if (standings.length === 0) {
    return {
      contestId,
      calculated: false,
      message: 'No participant standings to calculate ratings for.',
      changes: [],
    };
  }

  // Gather current ratings for all standing participants
  const userIds = standings.map((s) => s.userId);
  const users = await User.find({ _id: { $in: userIds } }).select('_id name contestRating contestsAttended');
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const contestantPayload = standings.map((st, idx) => {
    const u = userMap.get(st.userId.toString());
    return {
      userId: st.userId,
      currentRating: u?.contestRating || 1500,
      rank: idx + 1,
      solvedCount: st.solvedCount || 0,
      penaltySeconds: st.penaltySeconds || 0,
    };
  });

  // Calculate deterministic rating changes
  const ratingChanges = computeRatingChanges(contestantPayload);
  const changeMap = new Map(ratingChanges.map((rc) => [rc.userId.toString(), rc]));

  // Update ContestStanding records
  for (const st of standings) {
    const change = changeMap.get(st.userId.toString());
    if (change) {
      st.oldRating = change.oldRating;
      st.newRating = change.newRating;
      st.ratingDelta = change.delta;
      st.ratingBadge = change.ratingBadge;
      await st.save();
    }
  }

  // Update User records and insert ContestRatingHistory
  const historyEntries = [];

  for (const rc of ratingChanges) {
    const u = userMap.get(rc.userId.toString());
    if (u) {
      await User.findByIdAndUpdate(rc.userId, {
        $set: {
          contestRating: rc.newRating,
          ratingBadge: rc.ratingBadge,
        },
        $inc: { contestsAttended: 1 },
      });

      historyEntries.push({
        userId: rc.userId,
        contestId: contest._id,
        contestTitle: contest.title,
        rank: contestantPayload.find((c) => c.userId.toString() === rc.userId.toString())?.rank || 1,
        totalParticipants: standings.length,
        solvedCount: contestantPayload.find((c) => c.userId.toString() === rc.userId.toString())?.solvedCount || 0,
        oldRating: rc.oldRating,
        newRating: rc.newRating,
        delta: rc.delta,
        ratingBadge: rc.ratingBadge,
        performance: rc.performance,
        calculatedAt: new Date(),
      });
    }
  }

  // Insert or update rating history records
  for (const h of historyEntries) {
    await ContestRatingHistory.findOneAndUpdate(
      { userId: h.userId, contestId: h.contestId },
      { $set: h },
      { upsert: true }
    );
  }

  // Mark contest as ratings calculated
  contest.ratingsCalculatedAt = new Date();
  await contest.save();

  // Recompute platform global ranks in background
  recomputeGlobalRanks().catch(() => {});

  // Emit WebSocket broadcast to all connected viewers in contest room
  try {
    const { emitStandingsUpdate } = require('../sockets/contestSocket');
    emitStandingsUpdate(contestId, {
      ratingsFinalized: true,
      calculatedAt: contest.ratingsCalculatedAt,
    });
  } catch (_) {}

  return {
    contestId,
    calculated: true,
    totalParticipants: standings.length,
    calculatedAt: contest.ratingsCalculatedAt,
    changes: ratingChanges,
  };
}

module.exports = {
  getRatingBadge,
  computeRatingChanges,
  applyContestRatings,
  recomputeGlobalRanks,
};
