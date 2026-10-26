const mongoose = require('mongoose');
const Contest = require('../models/Contest');
const ContestParticipant = require('../models/ContestParticipant');
const Problem = require('../models/Problem');
const BuildProblem = require('../models/BuildProblem');
const Submission = require('../models/Submission');
const BuildSubmission = require('../models/BuildSubmission');

/**
 * Samples N documents from a model matching query criteria.
 */
async function sampleFromCollection(Model, matchQuery, count) {
  if (count <= 0) return [];
  const results = await Model.aggregate([
    { $match: matchQuery },
    { $sample: { size: count } },
  ]);
  return results;
}

/**
 * Executes random problem selection for a contest at its start time.
 * Supports:
 * - Sampling by difficulty (easy, medium, hard).
 * - Optional exclusion of problems already solved by any joined participant.
 * - Automatic shortfall fallback: if exclusion makes pool too small, relaxes filter.
 * - Deterministic ordering: easy -> medium -> hard with labels A, B, C...
 * - Idempotent: safe to run multiple times without re-randomizing.
 */
async function executeProblemSelection(contestId) {
  const contest = await Contest.findById(contestId);
  if (!contest) {
    throw new Error(`Contest ${contestId} not found for problem selection.`);
  }

  // Idempotency: If already has problems or selection mode is manual, do nothing
  if (Array.isArray(contest.problems) && contest.problems.length > 0) {
    return contest.problems;
  }
  if (contest.selection?.mode !== 'random') {
    return contest.problems || [];
  }

  const { counts = {}, excludeSolvedByParticipants } = contest.selection;
  const easyCount = Math.max(0, parseInt(counts.easy, 10) || 0);
  const mediumCount = Math.max(0, parseInt(counts.medium, 10) || 0);
  const hardCount = Math.max(0, parseInt(counts.hard, 10) || 0);
  const totalNeeded = easyCount + mediumCount + hardCount;

  if (totalNeeded === 0) {
    return [];
  }

  const isDsa = contest.type === 'dsa';
  const isPointsScoring = contest.scoring === 'points';

  // 1. Gather participant IDs if exclusion is requested
  let solvedProblemIds = [];
  if (excludeSolvedByParticipants) {
    const participants = await ContestParticipant.find({ contestId: contest._id }).select('userId');
    const userIds = participants.map((p) => p.userId);

    if (userIds.length > 0) {
      if (isDsa) {
        solvedProblemIds = await Submission.find({
          user: { $in: userIds },
          status: 'accepted',
        }).distinct('problem');
      } else {
        solvedProblemIds = await BuildSubmission.find({
          userId: { $in: userIds },
          status: 'accepted',
        }).distinct('problemId');
      }
    }
  }

  // 2. Sample helper per difficulty
  async function pickDifficultyProblems(difficulty, neededCount) {
    if (neededCount <= 0) return [];

    let baseQuery;
    if (isDsa) {
      baseQuery = { difficulty: difficulty.toLowerCase() };
    } else {
      // BuildProblem uses 'verified: true' and regex for case-insensitive difficulty
      baseQuery = {
        verified: true,
        difficulty: { $regex: new RegExp(`^${difficulty}$`, 'i') },
      };
    }

    const Model = isDsa ? Problem : BuildProblem;
    let picked = [];

    // Attempt 1: Exclude solved problems
    if (solvedProblemIds.length > 0) {
      const matchWithExclusion = {
        ...baseQuery,
        _id: { $nin: solvedProblemIds },
      };
      picked = await sampleFromCollection(Model, matchWithExclusion, neededCount);
    }

    // Shortfall check: if exclusion made pool too small, fill remainder from full pool
    if (picked.length < neededCount) {
      const shortfall = neededCount - picked.length;
      if (solvedProblemIds.length > 0) {
        console.warn(
          `⚠️ [ContestSelection] Pool shortfall for contest ${contest._id} (${difficulty}). Needed ${neededCount}, got ${picked.length} with exclusion. Relaxing filter to sample ${shortfall} from full pool.`
        );
      }

      const existingPickedIds = picked.map((p) => p._id);
      const matchFallback = {
        ...baseQuery,
        _id: { $nin: existingPickedIds },
      };
      const fallbackPicked = await sampleFromCollection(Model, matchFallback, shortfall);
      picked = picked.concat(fallbackPicked);
    }

    return picked;
  }

  // 3. Pick by difficulty: Easy, then Medium, then Hard
  const [easyList, medList, hardList] = await Promise.all([
    pickDifficultyProblems('easy', easyCount),
    pickDifficultyProblems('medium', mediumCount),
    pickDifficultyProblems('hard', hardCount),
  ]);

  const targetModel = isDsa ? 'Problem' : 'BuildProblem';
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const finalProblems = [];

  // Helper to format problems
  function appendProblems(list, defaultPts) {
    for (const prob of list) {
      const idx = finalProblems.length;
      const label = letters[idx] || `P${idx + 1}`;
      finalProblems.push({
        problemModel: targetModel,
        problemId: prob._id,
        label,
        points: isPointsScoring ? defaultPts : 100,
      });
    }
  }

  appendProblems(easyList, 100);
  appendProblems(medList, 200);
  appendProblems(hardList, 300);

  // 4. Atomically persist to contest document
  // Double check in case of concurrent execution
  const updatedContest = await Contest.findOneAndUpdate(
    { _id: contest._id, $or: [{ problems: { $size: 0 } }, { problems: { $exists: false } }] },
    { $set: { problems: finalProblems } },
    { new: true }
  );

  return updatedContest ? updatedContest.problems : contest.problems;
}

module.exports = {
  executeProblemSelection,
};
