/**
 * Pure, deterministic contest scoring engine.
 * No database queries, no side effects, fully testable with pure unit tests.
 */

const COMPILE_ERROR_STATUSES = new Set([
  'compile_error',
  'compile error',
  'compilation_error',
  'error',
]);

const ACCEPTED_STATUSES = new Set([
  'accepted',
  'pass',
]);

/**
 * Normalizes status strings for consistent checking.
 */
function normalizeStatus(status) {
  return (status || '').toString().trim().toLowerCase();
}

/**
 * Compute the standing of a single user for a contest given their submissions.
 *
 * @param {Array} userSubmissions - List of submissions for this user in this contest, sorted by createdAt asc
 * @param {Object} contest - Contest object with startTime, endTime, scoring ('icpc'|'points'), penaltyMinutes, problems
 * @param {Object} user - User object with _id, name, username
 * @returns {Object} Deterministic standing data
 */
function computeStanding(userSubmissions = [], contest, user) {
  if (!contest) {
    throw new Error('Contest is required for computeStanding.');
  }

  const contestStartMs = new Date(contest.startTime).getTime();
  const contestEndMs = new Date(contest.endTime).getTime();
  const penaltyMinutes = Math.max(0, parseInt(contest.penaltyMinutes, 10) || 20);
  const isPointsMode = contest.scoring === 'points';

  // Map problems from contest definition
  const contestProblems = Array.isArray(contest.problems) ? contest.problems : [];
  const problemMap = new Map();

  for (let i = 0; i < contestProblems.length; i++) {
    const p = contestProblems[i];
    const pId = p.problemId?.toString() || p._id?.toString() || `prob_${i}`;
    problemMap.set(pId, {
      problemId: p.problemId || p._id,
      label: p.label || String.fromCharCode(65 + i),
      points: Math.max(0, parseInt(p.points, 10) || (isPointsMode ? 100 : 1)),
      solved: false,
      bestScore: 0,
      wrongAttempts: 0,
      solvedAtSeconds: null,
      penaltySeconds: 0,
    });
  }

  let lastAcceptSeconds = null;

  // Process submissions in chronological order
  for (const sub of userSubmissions) {
    const subTimeMs = new Date(sub.createdAt).getTime();

    // Ignore submissions made before start or after end
    if (subTimeMs < contestStartMs || subTimeMs > contestEndMs) {
      continue;
    }

    const subProblemId = (sub.problemId || sub.problem)?._id?.toString() || (sub.problemId || sub.problem)?.toString();
    const probData = problemMap.get(subProblemId);
    if (!probData) {
      continue; // Submission for a problem not in this contest
    }

    const secondsFromStart = Math.max(0, Math.floor((subTimeMs - contestStartMs) / 1000));
    const status = normalizeStatus(sub.status || sub.verdict);
    const isAccepted = ACCEPTED_STATUSES.has(status);
    const isCompileError = COMPILE_ERROR_STATUSES.has(status);

    if (isPointsMode) {
      // Points Mode:
      // Award points. For full accept, award problem's assigned points.
      // For partial scoring (e.g. build mode test cases passed / total), compute ratio.
      let subScore = 0;
      if (isAccepted) {
        subScore = probData.points;
      } else if (sub.totalTestCases > 0 && sub.passedTestCases > 0) {
        subScore = Math.floor((sub.passedTestCases / sub.totalTestCases) * probData.points);
      } else if (typeof sub.score === 'number' && sub.score > 0) {
        subScore = Math.min(probData.points, sub.score);
      }

      if (subScore > probData.bestScore) {
        probData.bestScore = subScore;
        probData.solvedAtSeconds = secondsFromStart;
        lastAcceptSeconds = secondsFromStart;
      }

      if (isAccepted && !probData.solved) {
        probData.solved = true;
      }
    } else {
      // ICPC Mode:
      // Once solved, subsequent submissions for this problem are ignored.
      if (probData.solved) {
        continue;
      }

      if (isAccepted) {
        probData.solved = true;
        probData.solvedAtSeconds = secondsFromStart;
        probData.bestScore = 1;
        probData.penaltySeconds = secondsFromStart + (probData.wrongAttempts * penaltyMinutes * 60);

        if (lastAcceptSeconds === null || secondsFromStart > lastAcceptSeconds) {
          lastAcceptSeconds = secondsFromStart;
        }
      } else if (!isCompileError) {
        // Compile errors do not incur penalty attempts in standard ICPC rules
        probData.wrongAttempts += 1;
      }
    }
  }

  // Aggregate results across all contest problems
  let solvedCount = 0;
  let totalPoints = 0;
  let totalPenaltySeconds = 0;
  const perProblem = [];

  for (const prob of problemMap.values()) {
    if (prob.solved) {
      solvedCount += 1;
      totalPenaltySeconds += prob.penaltySeconds;
    }
    totalPoints += prob.bestScore;

    perProblem.push({
      problemId: prob.problemId,
      solved: prob.solved,
      bestScore: prob.bestScore,
      wrongAttempts: prob.wrongAttempts,
      solvedAtSeconds: prob.solvedAtSeconds,
    });
  }

  // Compute composite score for Redis ZADD / Mongo sort:
  // For ICPC: higher solvedCount dominates, lower penalty wins tie, earlier last accept breaks further ties
  // For Points: higher totalPoints dominates, earlier last accept breaks tie
  let composite = 0;
  if (isPointsMode) {
    // 1 point = 1e8 weight. (totalPoints * 1e8) - lastAcceptSeconds
    composite = (totalPoints * 1e8) - (lastAcceptSeconds !== null ? lastAcceptSeconds : 0);
  } else {
    // 1 solved problem = 1e8 weight. (solvedCount * 1e8) - totalPenaltySeconds
    composite = (solvedCount * 1e8) - totalPenaltySeconds;
  }

  const userId = user?._id || user?.id;
  const displayName = user?.name || user?.username || user?.displayName || 'Anonymous Participant';

  return {
    contestId: contest._id,
    userId,
    displayName,
    solvedCount,
    totalPoints,
    penaltySeconds: totalPenaltySeconds,
    lastAcceptSeconds,
    composite,
    perProblem,
    updatedAt: new Date(),
  };
}

module.exports = {
  computeStanding,
};
