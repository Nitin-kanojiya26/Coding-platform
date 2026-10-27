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

async function verifyMilestone1() {
  console.log('======================================================');
  console.log('🧪 Verifying Milestone 1: Contest Models & APIs');
  console.log('======================================================\n');

  // Check if port 5000 is running; if not, spin up in-process server
  const isPort5000InUse = await checkPort(5000);
  let activeServer = null;

  if (!isPort5000InUse) {
    console.log('ℹ️ Server is not running on port 5000. Launching in-process test server...');
    const { server } = require('../src/server');
    const testPort = 5051;
    API_BASE = `http://localhost:${testPort}/api`;
    await new Promise((resolve) => {
      activeServer = server.listen(testPort, resolve);
    });
    console.log(`🚀 In-process test server listening on port ${testPort}`);
  }

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/coding-platform');
  const User = require('../src/models/Users');
  const Contest = require('../src/models/Contest');
  const ContestParticipant = require('../src/models/ContestParticipant');

  // 1. Fetch or create test users (Admin and 2 standard users)
  let admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    admin = await User.create({
      name: 'TestAdminM1',
      email: 'testadmin_m1@example.com',
      password: 'password123',
      role: 'admin',
    });
  }

  let userA = await User.findOne({ email: 'usera_m1@example.com' });
  if (!userA) {
    userA = await User.create({
      name: 'UserA_M1',
      email: 'usera_m1@example.com',
      password: 'password123',
      role: 'user',
    });
  }

  let userB = await User.findOne({ email: 'userb_m1@example.com' });
  if (!userB) {
    userB = await User.create({
      name: 'UserB_M1',
      email: 'userb_m1@example.com',
      password: 'password123',
      role: 'user',
    });
  }

  const adminToken = jwt.sign({ id: admin._id }, process.env.JWT_SECRET || 'secret');
  const userAToken = jwt.sign({ id: userA._id }, process.env.JWT_SECRET || 'secret');
  const userBToken = jwt.sign({ id: userB._id }, process.env.JWT_SECRET || 'secret');

  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const userAHeaders = { Authorization: `Bearer ${userAToken}` };
  const userBHeaders = { Authorization: `Bearer ${userBToken}` };

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
    // -----------------------------------------------------------------
    // TEST 1: Validation - Invalid inputs get clear 400s
    // -----------------------------------------------------------------
    console.log('\n--- 1. Validation & Clear 400 Responses ---');

    // 1a. User trying to create public contest
    try {
      await axios.post(`${API_BASE}/contests`, {
        title: 'Public By User',
        kind: 'public',
        type: 'dsa',
        startTime: new Date(Date.now() + 3600000).toISOString(),
        durationMinutes: 60,
      }, { headers: userAHeaders });
      assert(false, 'Non-admin should not be allowed to create public contest');
    } catch (err) {
      assert(err.response?.status === 403, 'Non-admin blocked from public contest with 403');
    }

    // 1b. Missing / short title
    try {
      await axios.post(`${API_BASE}/contests`, {
        title: 'ab',
        kind: 'private',
        type: 'dsa',
        startTime: new Date(Date.now() + 3600000).toISOString(),
        durationMinutes: 60,
      }, { headers: userAHeaders });
      assert(false, 'Short title should be rejected');
    } catch (err) {
      assert(err.response?.status === 400 && err.response?.data?.message.includes('at least 3 characters'), 'Short title rejected with 400');
    }

    // 1c. Invalid duration (< 20 min)
    try {
      await axios.post(`${API_BASE}/contests`, {
        title: 'Valid Title Here',
        kind: 'private',
        type: 'dsa',
        startTime: new Date(Date.now() + 3600000).toISOString(),
        durationMinutes: 10,
      }, { headers: userAHeaders });
      assert(false, 'Duration < 20 should be rejected');
    } catch (err) {
      assert(err.response?.status === 400 && err.response?.data?.message.includes('between 20 and 240'), 'Duration < 20 rejected with 400');
    }

    // 1d. Start time in past
    try {
      await axios.post(`${API_BASE}/contests`, {
        title: 'Past Start Contest',
        kind: 'private',
        type: 'dsa',
        startTime: new Date(Date.now() - 3600000).toISOString(),
        durationMinutes: 60,
      }, { headers: userAHeaders });
      assert(false, 'Past start time should be rejected');
    } catch (err) {
      assert(err.response?.status === 400 && err.response?.data?.message.includes('cannot be in the past'), 'Past start time rejected with 400');
    }

    // 1e. Excessive problem counts exceeding pool
    try {
      await axios.post(`${API_BASE}/contests`, {
        title: 'Overpool Contest',
        kind: 'private',
        type: 'dsa',
        startTime: new Date(Date.now() + 3600000).toISOString(),
        durationMinutes: 60,
        selection: {
          mode: 'random',
          counts: { easy: 50, medium: 50, hard: 50 },
        },
      }, { headers: userAHeaders });
      assert(false, 'Excessive problem count should be rejected');
    } catch (err) {
      assert(err.response?.status === 400, 'Overpool count rejected with clear 400 message: ' + err.response?.data?.message);
    }

    // -----------------------------------------------------------------
    // TEST 2: Successful Private Contest Creation by User A
    // -----------------------------------------------------------------
    console.log('\n--- 2. Contest Creation & Join Code ---');
    const futureStart = new Date(Date.now() + 2 * 3600000); // 2 hours in future

    const createRes = await axios.post(`${API_BASE}/contests`, {
      title: 'User A Weekly Challenge',
      description: 'Private contest for peers',
      kind: 'private',
      type: 'dsa',
      startTime: futureStart.toISOString(),
      durationMinutes: 90,
      selection: {
        mode: 'random',
        counts: { easy: 1, medium: 1, hard: 0 },
      },
    }, { headers: userAHeaders });

    assert(createRes.status === 201, 'Private contest created successfully with 201');
    const createdContest = createRes.data?.contest;
    assert(createdContest?.joinCode && createdContest.joinCode.length === 8, `Join code generated: ${createdContest?.joinCode}`);
    assert(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/.test(createdContest?.joinCode), 'Join code strictly uses unambiguous alphabet (no 0, O, 1, I)');
    assert(createdContest?.status === 'scheduled', 'Computed status is "scheduled"');
    assert(Boolean(createRes.data?.serverNow), 'Response includes serverNow');

    // Verify creator auto-joined
    const participant = await ContestParticipant.findOne({ contestId: createdContest._id, userId: userA._id });
    assert(Boolean(participant), 'Creator is automatically registered as a participant');

    // -----------------------------------------------------------------
    // TEST 3: Privacy - Private contests are invisible to non-members
    // -----------------------------------------------------------------
    console.log('\n--- 3. Privacy & Visibility Rules ---');

    // User B lists contests
    const listResB = await axios.get(`${API_BASE}/contests`, { headers: userBHeaders });
    const isVisibleToB = (listResB.data?.contests || []).some((c) => c._id === createdContest._id);
    assert(!isVisibleToB, 'Private contest is NOT listed in User B contest list');

    // User A lists contests
    const listResA = await axios.get(`${API_BASE}/contests`, { headers: userAHeaders });
    const isVisibleToA = (listResA.data?.contests || []).some((c) => c._id === createdContest._id);
    assert(isVisibleToA, 'Private contest IS visible to Creator (User A)');

    // User B directly accesses details of User A private contest
    try {
      await axios.get(`${API_BASE}/contests/${createdContest._id}`, { headers: userBHeaders });
      assert(false, 'Non-participant User B should be forbidden from reading private contest details');
    } catch (err) {
      assert(err.response?.status === 403, 'Non-participant User B gets 403 on private contest');
    }

    // -----------------------------------------------------------------
    // TEST 4: Problem statements are hidden before start
    // -----------------------------------------------------------------
    console.log('\n--- 4. Problem Statements Hidden Before Start ---');

    // User A tries to view problems before start
    try {
      await axios.get(`${API_BASE}/contests/${createdContest._id}/problems`, { headers: userAHeaders });
      assert(false, 'Problems should be hidden before start');
    } catch (err) {
      assert(err.response?.status === 403 && err.response?.data?.message.includes('hidden until the contest begins'), 'GET /problems before start returns 403');
    }

    // -----------------------------------------------------------------
    // TEST 5: Edit and Cancel
    // -----------------------------------------------------------------
    console.log('\n--- 5. Edit and Cancel Workflows ---');

    // Edit contest title
    const updateRes = await axios.put(`${API_BASE}/contests/${createdContest._id}`, {
      title: 'User A Weekly Challenge (Updated)',
      durationMinutes: 120,
    }, { headers: userAHeaders });
    assert(updateRes.data?.contest?.title === 'User A Weekly Challenge (Updated)', 'Contest title updated before start');
    assert(updateRes.data?.contest?.durationMinutes === 120, 'Contest duration updated to 120m');

    // User B tries to cancel User A contest
    try {
      await axios.post(`${API_BASE}/contests/${createdContest._id}/cancel`, {}, { headers: userBHeaders });
      assert(false, 'User B should not be allowed to cancel User A contest');
    } catch (err) {
      assert(err.response?.status === 403, 'User B cannot cancel User A contest (403)');
    }

    // User A cancels contest
    const cancelRes = await axios.post(`${API_BASE}/contests/${createdContest._id}/cancel`, {}, { headers: userAHeaders });
    assert(cancelRes.status === 200, 'Contest cancelled successfully by Creator');
    assert(cancelRes.data?.contest?.status === 'cancelled', 'Computed status is "cancelled"');

    // -----------------------------------------------------------------
    // TEST 6: Public Contest Creation by Admin
    // -----------------------------------------------------------------
    console.log('\n--- 6. Admin Public Contest Creation ---');
    const adminContestRes = await axios.post(`${API_BASE}/contests`, {
      title: 'Codexium Official Bi-Weekly Contest',
      description: 'Public contest for everyone',
      kind: 'public',
      type: 'dsa',
      startTime: new Date(Date.now() + 4 * 3600000).toISOString(),
      durationMinutes: 90,
      selection: {
        mode: 'random',
        counts: { easy: 1, medium: 1, hard: 0 },
      },
    }, { headers: adminHeaders });

    assert(adminContestRes.status === 201, 'Admin created public contest with 201');
    const pubContest = adminContestRes.data?.contest;
    assert(pubContest?.kind === 'public', 'Contest kind is "public"');

    // User B CAN see the public contest
    const listPublicRes = await axios.get(`${API_BASE}/contests`, { headers: userBHeaders });
    const isPubVisible = (listPublicRes.data?.contests || []).some((c) => c._id === pubContest._id);
    assert(isPubVisible, 'Public contest is visible to User B');

    // Clean up test contests
    await Contest.deleteMany({ _id: { $in: [createdContest._id, pubContest._id] } });
    await ContestParticipant.deleteMany({ contestId: { $in: [createdContest._id, pubContest._id] } });

    console.log('\n======================================================');
    console.log(`📊 Result: ${passedTests}/${totalTests} tests passed.`);
    console.log('======================================================\n');

    if (passedTests === totalTests) {
      console.log('🎉 ALL MILESTONE 1 ACCEPTANCE CRITERIA VERIFIED!');
      process.exit(0);
    } else {
      console.error('❌ SOME TESTS FAILED.');
      process.exit(1);
    }
  } catch (outerErr) {
    console.error('Unexpected test error:', outerErr);
    process.exit(1);
  } finally {
    if (activeServer) {
      activeServer.close();
    }
    await mongoose.disconnect();
  }
}

verifyMilestone1();
