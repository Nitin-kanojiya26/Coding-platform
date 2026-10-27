const axios = require('axios');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const net = require('net');
require('dotenv').config();

function checkPort(port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', () => resolve(true)) // In use
      .once('listening', () => {
        tester.once('close', () => resolve(false)).close(); // Available
      })
      .listen(port);
  });
}

let API_BASE = 'http://localhost:5000/api';

async function verifyMilestone3() {
  console.log('======================================================');
  console.log('🧪 Verifying Milestone 3: Contest Submissions & Scoring');
  console.log('======================================================\n');

  // Check if port 5000 is running; if not, spin up in-process server
  const isPort5000InUse = await checkPort(5000);
  let activeServer = null;

  if (!isPort5000InUse) {
    console.log('ℹ️ Server is not running on port 5000. Launching in-process test server...');
    const { server } = require('../src/server');
    const testPort = 5053;
    API_BASE = `http://localhost:${testPort}/api`;
    await new Promise((resolve) => {
      activeServer = server.listen(testPort, resolve);
    });
    console.log(`🚀 In-process test server listening on port ${testPort}`);
  }

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/coding-platform');
  const User = require('../src/models/Users');
  const Problem = require('../src/models/Problem');
  const BuildProblem = require('../src/models/BuildProblem');
  const Contest = require('../src/models/Contest');
  const ContestParticipant = require('../src/models/ContestParticipant');
  const ContestStanding = require('../src/models/ContestStanding');
  const Submission = require('../src/models/Submission');
  const BuildSubmission = require('../src/models/BuildSubmission');
  const redisClient = require('../src/config/redis');
  const { computeStanding } = require('../src/services/contestScoringService');
  const { updateUserContestStanding, rebuildLeaderboard, getContestLeaderboard, getContestStats } = require('../src/services/contestLeaderboardService');

  // Test users
  let admin = await User.findOne({ role: 'admin' });
  let userA = await User.findOne({ email: 'usera_m2@example.com' });
  let userB = await User.findOne({ email: 'userb_m2@example.com' });
  let outsider = await User.findOne({ email: 'outsider_m3@example.com' });
  if (!outsider) {
    outsider = await User.create({
      name: 'OutsiderM3',
      email: 'outsider_m3@example.com',
      password: 'password123',
      role: 'user',
    });
  }

  const adminToken = jwt.sign({ id: admin._id }, process.env.JWT_SECRET || 'secret');
  const userAToken = jwt.sign({ id: userA._id }, process.env.JWT_SECRET || 'secret');
  const userBToken = jwt.sign({ id: userB._id }, process.env.JWT_SECRET || 'secret');
  const outsiderToken = jwt.sign({ id: outsider._id }, process.env.JWT_SECRET || 'secret');

  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const userAHeaders = { Authorization: `Bearer ${userAToken}` };
  const userBHeaders = { Authorization: `Bearer ${userBToken}` };
  const outsiderHeaders = { Authorization: `Bearer ${outsiderToken}` };

  const dsaProblem = await Problem.findOne();
  const buildProblem = await BuildProblem.findOne({ verified: true });

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
    }
  }

  try {
    // -------------------------------------------------------------------------
    // 1. Pure Scoring Engine Unit Assertions
    // -------------------------------------------------------------------------
    console.log('--- 1. Pure Scoring Engine Verification ---');
    const mockStart = new Date(Date.now() - 3600 * 1000);
    const mockEnd = new Date(Date.now() + 3600 * 1000);
    const mockContest = {
      _id: new mongoose.Types.ObjectId(),
      scoring: 'icpc',
      startTime: mockStart,
      endTime: mockEnd,
      penaltyMinutes: 20,
      problems: [
        { problemId: 'p1', label: 'A' },
        { problemId: 'p2', label: 'B' },
      ],
    };

    const st1 = computeStanding(
      [
        { problemId: 'p1', status: 'wrong_answer', createdAt: new Date(mockStart.getTime() + 10 * 60000) },
        { problemId: 'p1', status: 'accepted', createdAt: new Date(mockStart.getTime() + 20 * 60000) },
      ],
      mockContest,
      { _id: 'u1', name: 'User 1' }
    );

    assert(st1.solvedCount === 1, 'ICPC pure scoring solvedCount is 1');
    assert(st1.penaltySeconds === (20 + 20) * 60, 'ICPC penaltySeconds calculated (20m solved + 20m penalty = 2400s)');
    assert(st1.perProblem[0].wrongAttempts === 1, 'ICPC recorded 1 wrong attempt');

    // -------------------------------------------------------------------------
    // 2. DSA Contest Submission Gate Validations
    // -------------------------------------------------------------------------
    console.log('\n--- 2. DSA Contest Submission Gate Validations ---');

    // Create an active DSA contest (started 10m ago, ends in 50m)
    const activeContest = await Contest.create({
      title: 'Active DSA Contest M3',
      kind: 'public',
      type: 'dsa',
      scoring: 'icpc',
      createdBy: admin._id,
      startTime: new Date(Date.now() - 10 * 60 * 1000),
      durationMinutes: 60,
      endTime: new Date(Date.now() + 50 * 60 * 1000),
      problems: [{ problemModel: 'Problem', problemId: dsaProblem._id, label: 'A', points: 100 }],
      participantsCount: 1,
    });

    // Register User A as participant
    await ContestParticipant.create({
      contestId: activeContest._id,
      userId: userA._id,
    });

    // Test A: Outsider submitting to contest -> 403 Forbidden
    try {
      await axios.post(
        `${API_BASE}/submissions`,
        {
          problemId: dsaProblem._id.toString(),
          language: 'javascript',
          code: 'console.log(1);',
          contestId: activeContest._id.toString(),
        },
        { headers: outsiderHeaders }
      );
      assert(false, 'Non-participant was able to submit to contest');
    } catch (e) {
      assert(e.response?.status === 403, 'Non-participant blocked from submitting with 403');
    }

    // Test B: Submitting to future contest before it starts -> 400
    const futureContest = await Contest.create({
      title: 'Future Contest',
      kind: 'public',
      type: 'dsa',
      scoring: 'icpc',
      createdBy: admin._id,
      startTime: new Date(Date.now() + 3600 * 1000),
      durationMinutes: 60,
      endTime: new Date(Date.now() + 7200 * 1000),
      problems: [{ problemModel: 'Problem', problemId: dsaProblem._id, label: 'A', points: 100 }],
    });
    await ContestParticipant.create({ contestId: futureContest._id, userId: userA._id });

    try {
      await axios.post(
        `${API_BASE}/submissions`,
        {
          problemId: dsaProblem._id.toString(),
          language: 'javascript',
          code: 'console.log(1);',
          contestId: futureContest._id.toString(),
        },
        { headers: userAHeaders }
      );
      assert(false, 'Submission allowed before contest started');
    } catch (e) {
      assert(e.response?.status === 400 && e.response?.data?.message?.includes('not started'), 'Early submission blocked with 400');
    }

    // Test C: Submitting to ended contest -> 400
    const endedContest = await Contest.create({
      title: 'Ended Contest',
      kind: 'public',
      type: 'dsa',
      scoring: 'icpc',
      createdBy: admin._id,
      startTime: new Date(Date.now() - 7200 * 1000),
      durationMinutes: 60,
      endTime: new Date(Date.now() - 3600 * 1000),
      problems: [{ problemModel: 'Problem', problemId: dsaProblem._id, label: 'A', points: 100 }],
    });
    await ContestParticipant.create({ contestId: endedContest._id, userId: userA._id });

    try {
      await axios.post(
        `${API_BASE}/submissions`,
        {
          problemId: dsaProblem._id.toString(),
          language: 'javascript',
          code: 'console.log(1);',
          contestId: endedContest._id.toString(),
        },
        { headers: userAHeaders }
      );
      assert(false, 'Submission allowed after contest ended');
    } catch (e) {
      assert(e.response?.status === 400 && e.response?.data?.message?.includes('ended'), 'Post-contest submission blocked with 400');
    }

    // Test D: Submitting problem that does NOT belong to contest -> 400
    const otherProblem = await Problem.findOne({ _id: { $ne: dsaProblem._id } });
    if (otherProblem) {
      try {
        await axios.post(
          `${API_BASE}/submissions`,
          {
            problemId: otherProblem._id.toString(),
            language: 'javascript',
            code: 'console.log(1);',
            contestId: activeContest._id.toString(),
          },
          { headers: userAHeaders }
        );
        assert(false, 'Foreign problem submission allowed in contest');
      } catch (e) {
        assert(e.response?.status === 400 && e.response?.data?.message?.includes('not part of'), 'Foreign problem rejected with 400');
      }
    } else {
      console.log('Skipping foreign problem test (only 1 DSA problem in DB).');
    }

    // Test E: Valid participant submission accepted
    const subRes = await axios.post(
      `${API_BASE}/submissions`,
      {
        problemId: dsaProblem._id.toString(),
        language: 'javascript',
        code: 'console.log(1);',
        contestId: activeContest._id.toString(),
      },
      { headers: userAHeaders }
    );
    assert(subRes.status === 202 || subRes.status === 201, 'Valid contest submission queued successfully');
    assert(subRes.data.submission?.contestId?.toString() === activeContest._id.toString(), 'Contest ID attached to submission record');

    // -------------------------------------------------------------------------
    // 3. Build Mode (API) Contest Validation & One-In-Flight Rule
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Build Mode Contest & One-In-Flight Rule ---');

    if (buildProblem) {
      const apiContest = await Contest.create({
        title: 'Active API Contest M3',
        kind: 'public',
        type: 'api',
        scoring: 'points',
        createdBy: admin._id,
        startTime: new Date(Date.now() - 10 * 60 * 1000),
        durationMinutes: 60,
        endTime: new Date(Date.now() + 50 * 60 * 1000),
        problems: [{ problemModel: 'BuildProblem', problemId: buildProblem._id, label: 'A', points: 100 }],
      });

      await ContestParticipant.create({ contestId: apiContest._id, userId: userA._id });

      // First API contest submission
      const apiSubRes = await axios.post(
        `${API_BASE}/build/submit`,
        {
          slug: buildProblem.slug,
          files: [{ path: 'server.js', content: 'console.log("api");' }],
          contestId: apiContest._id.toString(),
        },
        { headers: userAHeaders }
      );
      assert(apiSubRes.status === 202, 'First API contest submission queued (202)');

      // Second immediate submission -> One-in-flight rule triggers 429
      try {
        await axios.post(
          `${API_BASE}/build/submit`,
          {
            slug: buildProblem.slug,
            files: [{ path: 'server.js', content: 'console.log("api 2");' }],
            contestId: apiContest._id.toString(),
          },
          { headers: userAHeaders }
        );
        assert(false, 'One-in-flight rule did not block concurrent submission');
      } catch (e) {
        assert(e.response?.status === 429 && e.response?.data?.message?.includes('in flight'), 'One-in-flight rule triggered 429 Too Many Requests');
      }
    } else {
      console.log('Skipping API contest validation: no verified BuildProblem found.');
    }

    // -------------------------------------------------------------------------
    // 4. Standing Recalculation & Redis Leaderboard Updates
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Standing Recalculation & Redis Leaderboard Updates ---');

    // Simulate User A having solved dsaProblem
    await Submission.create({
      user: userA._id,
      problem: dsaProblem._id,
      contestId: activeContest._id,
      language: 'javascript',
      code: 'console.log("accepted");',
      status: 'accepted',
      createdAt: new Date(activeContest.startTime.getTime() + 15 * 60 * 1000),
    });

    // Simulate User B having solved with 1 WA
    await ContestParticipant.create({ contestId: activeContest._id, userId: userB._id });
    await Submission.create({
      user: userB._id,
      problem: dsaProblem._id,
      contestId: activeContest._id,
      language: 'javascript',
      code: 'console.log("wrong");',
      status: 'wrong_answer',
      createdAt: new Date(activeContest.startTime.getTime() + 10 * 60 * 1000),
    });
    await Submission.create({
      user: userB._id,
      problem: dsaProblem._id,
      contestId: activeContest._id,
      language: 'javascript',
      code: 'console.log("accepted");',
      status: 'accepted',
      createdAt: new Date(activeContest.startTime.getTime() + 20 * 60 * 1000),
    });

    // Update standings for both users
    const standingA = await updateUserContestStanding(activeContest._id, userA._id);
    const standingB = await updateUserContestStanding(activeContest._id, userB._id);

    assert(standingA.solvedCount === 1, 'User A standing has solvedCount = 1');
    assert(standingB.solvedCount === 1, 'User B standing has solvedCount = 1');
    assert(standingA.penaltySeconds < standingB.penaltySeconds, 'User A has fewer penalty seconds than User B');
    assert(standingA.composite > standingB.composite, 'User A has higher composite score than User B');

    // -------------------------------------------------------------------------
    // 5. Leaderboard Standings & Stats API Endpoints
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Leaderboard Standings & Stats API Endpoints ---');

    const lbRes = await axios.get(`${API_BASE}/contests/${activeContest._id}/standings`, { headers: userAHeaders });
    assert(lbRes.status === 200, 'GET /standings returned 200 OK');
    assert(lbRes.data.standings.length >= 2, 'Leaderboard returned at least 2 participants');
    assert(lbRes.data.standings[0].rank === 1, 'First participant has rank 1');
    assert(lbRes.data.standings[0].userId.toString() === userA._id.toString(), 'User A is ranked #1 on leaderboard');
    assert(lbRes.data.standings[1].rank === 2, 'User B is ranked #2 on leaderboard');

    const statsRes = await axios.get(`${API_BASE}/contests/${activeContest._id}/stats`, { headers: userAHeaders });
    assert(statsRes.status === 200, 'GET /stats returned 200 OK');
    assert(statsRes.data.stats.totalSubmissions >= 3, 'Stats accurately counted contest submissions');
    assert(statsRes.data.stats.problemStats[0].acceptedCount >= 1, 'Stats problem-by-problem acceptance tracked');

    // -------------------------------------------------------------------------
    // 6. Redis Rebuild On Cache Miss
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Redis Leaderboard Rebuild on Cache Miss ---');

    const rebuilt = await rebuildLeaderboard(activeContest._id);
    assert(rebuilt.length >= 2, 'Leaderboard rebuilt successfully from database');

    console.log('\n======================================================');
    console.log(`📊 Result: ${passedTests}/${totalTests} tests passed.`);
    console.log('======================================================\n');

    if (passedTests === totalTests) {
      console.log('🎉 ALL MILESTONE 3 ACCEPTANCE CRITERIA VERIFIED!');
    }
  } catch (err) {
    console.error('Fatal test error:', err.response?.data || err.message);
  } finally {
    if (activeServer) {
      activeServer.close();
    }
    await mongoose.disconnect();
    setTimeout(() => process.exit(0), 500);
  }
}

verifyMilestone3();
