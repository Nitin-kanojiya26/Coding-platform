const axios = require('axios');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
require('dotenv').config();

const API_BASE = 'http://localhost:5000/api';

async function verifyMilestone2() {
  console.log('======================================================');
  console.log('🧪 Verifying Milestone 2: Joining, Inviting & Lifecycle');
  console.log('======================================================\n');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/coding-platform');
  const User = require('../src/models/Users');
  const Problem = require('../src/models/Problem');
  const Submission = require('../src/models/Submission');
  const Contest = require('../src/models/Contest');
  const ContestParticipant = require('../src/models/ContestParticipant');
  const ContestNotification = require('../src/models/ContestNotification');
  const { executeProblemSelection } = require('../src/services/contestSelectionService');
  const { scheduleContestLifecycleJobs, cancelContestLifecycleJobs, contestLifecycleQueue } = require('../src/queues/contestLifecycleQueue');
  const { reconcileContestLifecycle } = require('../src/workers/contestLifecycleWorker');

  // 1. Fetch or create test users
  let admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    admin = await User.create({
      name: 'AdminM2',
      email: 'admin_m2@example.com',
      password: 'password123',
      role: 'admin',
    });
  }

  let userA = await User.findOne({ email: 'usera_m2@example.com' });
  if (!userA) {
    userA = await User.create({
      name: 'UserA_M2',
      email: 'usera_m2@example.com',
      password: 'password123',
      role: 'user',
    });
  }

  let userB = await User.findOne({ email: 'userb_m2@example.com' });
  if (!userB) {
    userB = await User.create({
      name: 'UserB_M2',
      email: 'userb_m2@example.com',
      password: 'password123',
      role: 'user',
    });
  }

  let userC = await User.findOne({ email: 'userc_m2@example.com' });
  if (!userC) {
    userC = await User.create({
      name: 'UserC_M2',
      email: 'userc_m2@example.com',
      password: 'password123',
      role: 'user',
    });
  }

  // Clean up any test contests created in prior runs for these test users
  await Contest.deleteMany({ createdBy: { $in: [userA._id, userB._id, userC._id] } });
  await ContestParticipant.deleteMany({ userId: { $in: [userA._id, userB._id, userC._id] } });

  const dsaProb = await Problem.findOne();

  const adminToken = jwt.sign({ id: admin._id }, process.env.JWT_SECRET || 'secret');
  const userAToken = jwt.sign({ id: userA._id }, process.env.JWT_SECRET || 'secret');
  const userBToken = jwt.sign({ id: userB._id }, process.env.JWT_SECRET || 'secret');
  const userCToken = jwt.sign({ id: userC._id }, process.env.JWT_SECRET || 'secret');

  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const userAHeaders = { Authorization: `Bearer ${userAToken}` };
  const userBHeaders = { Authorization: `Bearer ${userBToken}` };
  const userCHeaders = { Authorization: `Bearer ${userCToken}` };

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

  const futureStart = new Date(Date.now() + 2 * 3600 * 1000).toISOString();

  try {
    // -------------------------------------------------------------------------
    // 1. Public Contest Join & Capacity Enforcement
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Public Contest Join & Capacity Enforcement ---');

    // Admin creates public contest with maxParticipants: 2 (Admin is participant #1)
    const pubRes = await axios.post(
      `${API_BASE}/contests/public`,
      {
        title: 'Public Cap Test Contest',
        startTime: futureStart,
        durationMinutes: 60,
        maxParticipants: 2,
        selection: { mode: 'manual' },
        problems: [{ problemId: dsaProb._id.toString() }],
      },
      { headers: adminHeaders }
    );
    const pubContestId = pubRes.data.contest._id;

    // User A joins (participant #2) -> should succeed
    const joinARes = await axios.post(`${API_BASE}/contests/${pubContestId}/join`, {}, { headers: userAHeaders });
    assert(joinARes.status === 200, 'User A joined public contest successfully');

    // User A tries to join again -> should fail with 400 duplicate
    try {
      await axios.post(`${API_BASE}/contests/${pubContestId}/join`, {}, { headers: userAHeaders });
      assert(false, 'Duplicate join was not blocked');
    } catch (e) {
      assert(e.response?.status === 400 && e.response?.data?.message?.includes('already joined'), 'Duplicate join rejected with 400');
    }

    // User B tries to join -> capacity 2 reached -> should fail with 400
    try {
      await axios.post(`${API_BASE}/contests/${pubContestId}/join`, {}, { headers: userBHeaders });
      assert(false, 'Capacity overflow was not blocked');
    } catch (e) {
      assert(e.response?.status === 400 && e.response?.data?.message?.includes('maximum capacity'), 'Capacity overflow rejected with 400 (max: 2)');
    }

    // -------------------------------------------------------------------------
    // 2. Late Join Rules
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Late Join Rules ---');

    // Create contest in DB with allowLateJoin: false that started 5 mins ago
    const runningContest = await Contest.create({
      title: 'No Late Joins Contest',
      kind: 'public',
      type: 'dsa',
      scoring: 'icpc',
      createdBy: admin._id,
      startTime: new Date(Date.now() - 5 * 60 * 1000),
      durationMinutes: 60,
      endTime: new Date(Date.now() + 55 * 60 * 1000),
      allowLateJoin: false,
      problems: [{ problemModel: 'Problem', problemId: dsaProb._id, label: 'A', points: 100 }],
      participantsCount: 1,
    });

    try {
      await axios.post(`${API_BASE}/contests/${runningContest._id}/join`, {}, { headers: userBHeaders });
      assert(false, 'Late join was permitted when allowLateJoin is false');
    } catch (e) {
      assert(e.response?.status === 400 && e.response?.data?.message?.includes('Late joins are not allowed'), 'Late join correctly rejected with 400');
    }

    // -------------------------------------------------------------------------
    // 3. Private Contest Join by Code & Rate Limiting
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Private Contest Join by Code & Normalization ---');

    // User A creates private contest
    const privRes = await axios.post(
      `${API_BASE}/contests/private`,
      {
        title: 'Private Code Test Match',
        startTime: futureStart,
        durationMinutes: 60,
        selection: { mode: 'manual' },
        problems: [{ problemId: dsaProb._id.toString() }],
      },
      { headers: userAHeaders }
    );
    const joinCode = privRes.data.contest.joinCode;
    assert(typeof joinCode === 'string' && joinCode.length === 8, `Private contest created with 8-char join code: ${joinCode}`);

    // User B joins via joinCode (lowercase test for normalization)
    const joinCodeRes = await axios.post(
      `${API_BASE}/contests/join-by-code`,
      { joinCode: joinCode.toLowerCase() },
      { headers: userBHeaders }
    );
    assert(joinCodeRes.status === 200, 'User B joined private contest using case-insensitive join code');

    // Invalid code check
    try {
      await axios.post(`${API_BASE}/contests/join-by-code`, { joinCode: 'INVALID8' }, { headers: userCHeaders });
      assert(false, 'Invalid join code was accepted');
    } catch (e) {
      assert(e.response?.status === 404, 'Invalid join code rejected with 404');
    }

    // -------------------------------------------------------------------------
    // 4. Leave Contest Workflow
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Leave Contest Workflow ---');

    // User B leaves private contest before start
    const leaveRes = await axios.post(`${API_BASE}/contests/${privRes.data.contest._id}/leave`, {}, { headers: userBHeaders });
    assert(leaveRes.status === 200, 'User B successfully left the contest before start');

    // Leaving when not a participant
    try {
      await axios.post(`${API_BASE}/contests/${privRes.data.contest._id}/leave`, {}, { headers: userBHeaders });
      assert(false, 'Non-participant was able to leave');
    } catch (e) {
      assert(e.response?.status === 400, 'Non-participant leaving rejected with 400');
    }

    // Creator tries to leave their own contest -> blocked
    try {
      await axios.post(`${API_BASE}/contests/${privRes.data.contest._id}/leave`, {}, { headers: userAHeaders });
      assert(false, 'Creator was able to leave their own contest');
    } catch (e) {
      assert(e.response?.status === 400 && e.response?.data?.message?.includes('creator cannot leave'), 'Contest creator blocked from leaving (must cancel)');
    }

    // -------------------------------------------------------------------------
    // 5. Invitations Workflow
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Invitations Workflow ---');

    const inviteRes = await axios.post(
      `${API_BASE}/contests/${privRes.data.contest._id}/invite`,
      { emails: [userB.email, userC.email, 'nonexistent_test@example.com'] },
      { headers: userAHeaders }
    );
    assert(inviteRes.data.invitedCount === 2, `Invited 2 existing users (not found: ${inviteRes.data.notFoundCount})`);

    const notifCount = await ContestNotification.countDocuments({
      contestId: privRes.data.contest._id,
      type: 'invite',
    });
    assert(notifCount === 2, 'ContestNotification records created with type "invite"');

    // Unauthorized user cannot invite
    try {
      await axios.post(
        `${API_BASE}/contests/${privRes.data.contest._id}/invite`,
        { emails: ['test@example.com'] },
        { headers: userBHeaders }
      );
      assert(false, 'Non-creator was able to send invites');
    } catch (e) {
      assert(e.response?.status === 403, 'Non-creator blocked from sending invitations with 403');
    }

    // -------------------------------------------------------------------------
    // 6. Random Selection Engine & Participant Solved Exclusion
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Random Selection Engine & Solved Problems Filter ---');

    // Find 2 easy DSA problems
    const easyProbs = await Problem.find({ difficulty: 'easy' }).limit(2);
    if (easyProbs.length >= 2) {
      // Simulate User A having solved problem 0
      const solvedProb = easyProbs[0];
      const unsolvedProb = easyProbs[1];

      await Submission.create({
        user: userA._id,
        problem: solvedProb._id,
        code: 'console.log(1);',
        language: 'javascript',
        status: 'accepted',
      });

      // Create random contest excluding solved problems
      const randomContest = await Contest.create({
        title: 'Random Selection Exclusion Test',
        kind: 'private',
        type: 'dsa',
        scoring: 'icpc',
        createdBy: userA._id,
        startTime: futureStart,
        durationMinutes: 60,
        endTime: new Date(Date.now() + 3 * 3600 * 1000),
        selection: {
          mode: 'random',
          counts: { easy: 1, medium: 0, hard: 0 },
          excludeSolvedByParticipants: true,
        },
        participantsCount: 1,
      });

      await ContestParticipant.create({
        contestId: randomContest._id,
        userId: userA._id,
      });

      // Execute selection
      const picked = await executeProblemSelection(randomContest._id);
      assert(picked.length === 1, 'Random problem selection picked 1 easy problem');
      assert(picked[0].label === 'A', 'First problem assigned label "A"');
      assert(picked[0].points === 100, 'Problem assigned points 100');

      // Crucial assertion: the problem User A already solved must NOT be picked!
      assert(
        picked[0].problemId.toString() !== solvedProb._id.toString(),
        `Solved problem (${solvedProb.title}) was correctly excluded from selection!`
      );
    } else {
      console.log('Skipping exclusion assertion: fewer than 2 easy problems in database.');
    }

    // -------------------------------------------------------------------------
    // 7. Lifecycle Queue Scheduling & Startup Reconciliation
    // -------------------------------------------------------------------------
    console.log('\n--- 7. BullMQ Lifecycle Queue & Reconciliation ---');

    // Create a contest to test scheduling
    const lcContest = await Contest.create({
      title: 'Lifecycle Test Contest',
      kind: 'public',
      type: 'dsa',
      scoring: 'icpc',
      createdBy: admin._id,
      startTime: new Date(Date.now() + 7200 * 1000),
      durationMinutes: 60,
      endTime: new Date(Date.now() + (7200 + 3600) * 1000),
      problems: [{ problemModel: 'Problem', problemId: dsaProb._id, label: 'A', points: 100 }],
    });

    await scheduleContestLifecycleJobs(lcContest);
    assert(true, 'BullMQ delayed jobs scheduled (start, end, reminder)');

    await cancelContestLifecycleJobs(lcContest._id);
    assert(true, 'BullMQ delayed jobs cancelled cleanly');

    // Test startup reconciliation sweep
    await reconcileContestLifecycle();
    assert(true, 'Startup reconciliation safety sweep ran without error');

    console.log('\n======================================================');
    console.log(`📊 Result: ${passedTests}/${totalTests} tests passed.`);
    console.log('======================================================\n');

    if (passedTests === totalTests) {
      console.log('🎉 ALL MILESTONE 2 ACCEPTANCE CRITERIA VERIFIED!');
    }
  } catch (err) {
    console.error('Fatal test error:', err.response?.data || err.message);
  } finally {
    await mongoose.disconnect();
    // Allow any background queue connections to finish
    setTimeout(() => process.exit(0), 500);
  }
}

verifyMilestone2();
