const assert = require('assert');
const { computeStanding } = require('../src/services/contestScoringService');

function runUnitTests() {
  console.log('======================================================');
  console.log('🧪 Running Pure Scoring Engine Unit Tests');
  console.log('======================================================\n');

  const baseStart = new Date('2026-10-27T10:00:00.000Z');
  const baseEnd = new Date('2026-10-27T12:00:00.000Z'); // 2 hours

  const mockContestICPC = {
    _id: 'contest_1',
    scoring: 'icpc',
    startTime: baseStart,
    endTime: baseEnd,
    penaltyMinutes: 20,
    problems: [
      { problemId: 'prob_A', label: 'A' },
      { problemId: 'prob_B', label: 'B' },
      { problemId: 'prob_C', label: 'C' },
    ],
  };

  const mockUser = {
    _id: 'user_1',
    name: 'Alice',
  };

  // Test 1: Solved problem A on first attempt at 10 minutes (600s)
  {
    const subs = [
      {
        problemId: 'prob_A',
        status: 'accepted',
        createdAt: new Date(baseStart.getTime() + 10 * 60 * 1000), // 10m
      },
    ];
    const standing = computeStanding(subs, mockContestICPC, mockUser);
    assert.strictEqual(standing.solvedCount, 1, 'Should have 1 solved problem');
    assert.strictEqual(standing.penaltySeconds, 600, 'Penalty should be 600 seconds');
    assert.strictEqual(standing.lastAcceptSeconds, 600, 'Last accept should be 600s');
    console.log('✅ [PASS] 1. ICPC clean first-attempt accept');
  }

  // Test 2: Solved problem A on 3rd attempt (2 WA before AC) at 25 minutes
  // Penalty = 25m + (2 * 20m) = 65 minutes = 3900 seconds
  {
    const subs = [
      {
        problemId: 'prob_A',
        status: 'wrong_answer',
        createdAt: new Date(baseStart.getTime() + 5 * 60 * 1000),
      },
      {
        problemId: 'prob_A',
        status: 'wrong_answer',
        createdAt: new Date(baseStart.getTime() + 15 * 60 * 1000),
      },
      {
        problemId: 'prob_A',
        status: 'accepted',
        createdAt: new Date(baseStart.getTime() + 25 * 60 * 1000),
      },
    ];
    const standing = computeStanding(subs, mockContestICPC, mockUser);
    assert.strictEqual(standing.solvedCount, 1, 'Should have 1 solved problem');
    assert.strictEqual(standing.penaltySeconds, 65 * 60, 'Penalty should be 65 min * 60 = 3900s');
    assert.strictEqual(standing.perProblem[0].wrongAttempts, 2, 'Should record 2 wrong attempts');
    console.log('✅ [PASS] 2. ICPC wrong attempts penalty calculation');
  }

  // Test 3: Compile errors do not incur penalty
  {
    const subs = [
      {
        problemId: 'prob_A',
        status: 'compile_error',
        createdAt: new Date(baseStart.getTime() + 5 * 60 * 1000),
      },
      {
        problemId: 'prob_A',
        status: 'accepted',
        createdAt: new Date(baseStart.getTime() + 10 * 60 * 1000),
      },
    ];
    const standing = computeStanding(subs, mockContestICPC, mockUser);
    assert.strictEqual(standing.perProblem[0].wrongAttempts, 0, 'Compile error should not increment wrong attempts');
    assert.strictEqual(standing.penaltySeconds, 600, 'Penalty should be 600s with 0 penalty attempts');
    console.log('✅ [PASS] 3. ICPC compile error zero-penalty check');
  }

  // Test 4: Unsolved problem with multiple WA adds 0 to total penalty
  {
    const subs = [
      {
        problemId: 'prob_A',
        status: 'accepted',
        createdAt: new Date(baseStart.getTime() + 10 * 60 * 1000), // 600s penalty
      },
      {
        problemId: 'prob_B',
        status: 'wrong_answer',
        createdAt: new Date(baseStart.getTime() + 20 * 60 * 1000),
      },
      {
        problemId: 'prob_B',
        status: 'time_limit_exceeded',
        createdAt: new Date(baseStart.getTime() + 30 * 60 * 1000),
      },
    ];
    const standing = computeStanding(subs, mockContestICPC, mockUser);
    assert.strictEqual(standing.solvedCount, 1, 'Only prob_A is solved');
    assert.strictEqual(standing.penaltySeconds, 600, 'Unsolved prob_B should NOT contribute to penalty');
    assert.strictEqual(standing.perProblem[1].wrongAttempts, 2, 'Prob_B records 2 wrong attempts');
    console.log('✅ [PASS] 4. ICPC unsolved problem penalty exclusion');
  }

  // Test 5: Submissions after first AC are ignored
  {
    const subs = [
      {
        problemId: 'prob_A',
        status: 'accepted',
        createdAt: new Date(baseStart.getTime() + 10 * 60 * 1000), // 600s
      },
      {
        problemId: 'prob_A',
        status: 'wrong_answer', // submitted after AC
        createdAt: new Date(baseStart.getTime() + 20 * 60 * 1000),
      },
    ];
    const standing = computeStanding(subs, mockContestICPC, mockUser);
    assert.strictEqual(standing.penaltySeconds, 600, 'Post-AC submission must be ignored');
    console.log('✅ [PASS] 5. ICPC post-AC submission ignored');
  }

  // Test 6: Submissions after contest endTime are ignored
  {
    const subs = [
      {
        problemId: 'prob_A',
        status: 'accepted',
        createdAt: new Date(baseEnd.getTime() + 60 * 1000), // 1 minute after contest ended
      },
    ];
    const standing = computeStanding(subs, mockContestICPC, mockUser);
    assert.strictEqual(standing.solvedCount, 0, 'Late submission after endTime must not be counted');
    console.log('✅ [PASS] 6. Late submission after contest endTime ignored');
  }

  // Test 7: Composite ranking comparison
  // User A: 2 solved, 40m (2400s) penalty
  // User B: 2 solved, 60m (3600s) penalty
  // User C: 1 solved, 10m (600s) penalty
  {
    const standingA = computeStanding(
      [
        { problemId: 'prob_A', status: 'accepted', createdAt: new Date(baseStart.getTime() + 20 * 60000) },
        { problemId: 'prob_B', status: 'accepted', createdAt: new Date(baseStart.getTime() + 20 * 60000) },
      ],
      mockContestICPC,
      { _id: 'uA', name: 'UserA' }
    );
    const standingB = computeStanding(
      [
        { problemId: 'prob_A', status: 'accepted', createdAt: new Date(baseStart.getTime() + 30 * 60000) },
        { problemId: 'prob_B', status: 'accepted', createdAt: new Date(baseStart.getTime() + 30 * 60000) },
      ],
      mockContestICPC,
      { _id: 'uB', name: 'UserB' }
    );
    const standingC = computeStanding(
      [
        { problemId: 'prob_A', status: 'accepted', createdAt: new Date(baseStart.getTime() + 10 * 60000) },
      ],
      mockContestICPC,
      { _id: 'uC', name: 'UserC' }
    );

    assert(standingA.composite > standingB.composite, 'User A (fewer penalty mins) must rank higher than User B');
    assert(standingB.composite > standingC.composite, 'User B (2 solved) must rank higher than User C (1 solved)');
    console.log('✅ [PASS] 7. ICPC composite ranking order verified');
  }

  // Test 8: Points Mode Scoring
  {
    const mockContestPoints = {
      _id: 'contest_pts',
      scoring: 'points',
      startTime: baseStart,
      endTime: baseEnd,
      problems: [
        { problemId: 'prob_A', label: 'A', points: 100 },
        { problemId: 'prob_B', label: 'B', points: 200 },
      ],
    };

    const subs = [
      // Partial score on prob_A (e.g. 5/10 test cases -> 50 pts)
      {
        problemId: 'prob_A',
        status: 'wrong_answer',
        passedTestCases: 5,
        totalTestCases: 10,
        createdAt: new Date(baseStart.getTime() + 10 * 60000),
      },
      // Later improved score on prob_A (full AC -> 100 pts)
      {
        problemId: 'prob_A',
        status: 'accepted',
        passedTestCases: 10,
        totalTestCases: 10,
        createdAt: new Date(baseStart.getTime() + 20 * 60000),
      },
      // Partial score on prob_B (e.g. 1/2 test cases -> 100 pts out of 200)
      {
        problemId: 'prob_B',
        status: 'wrong_answer',
        passedTestCases: 1,
        totalTestCases: 2,
        createdAt: new Date(baseStart.getTime() + 30 * 60000),
      },
    ];

    const standing = computeStanding(subs, mockContestPoints, mockUser);
    assert.strictEqual(standing.totalPoints, 200, 'Total points should be 100 (A) + 100 (B) = 200');
    assert.strictEqual(standing.lastAcceptSeconds, 30 * 60, 'Last accept should be 30m = 1800s');
    console.log('✅ [PASS] 8. Points mode partial scoring and best score accumulation');
  }

  console.log('\n======================================================');
  console.log('🎉 ALL 8 SCORING UNIT TESTS PASSED DETERMINISTICALLY!');
  console.log('======================================================\n');
}

runUnitTests();
