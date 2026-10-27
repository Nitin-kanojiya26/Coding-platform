const axios = require('axios');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const net = require('net');
require('dotenv').config();

function checkPort(port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', () => resolve(true))
      .once('listening', () => {
        tester.once('close', () => resolve(false)).close();
      })
      .listen(port);
  });
}

let API_BASE = 'http://localhost:5000/api';

async function verifyMilestone5() {
  console.log('======================================================');
  console.log('🧪 Verifying Milestone 5: Email Queue & Notifications');
  console.log('======================================================\n');

  // Check if server is running; if not, spin up test server
  const isPort5000InUse = await checkPort(5000);
  let activeServer = null;

  if (!isPort5000InUse) {
    console.log('ℹ️ Server is not running on port 5000. Launching in-process test server...');
    const { server } = require('../src/server');
    const testPort = 5056;
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
  const ContestNotification = require('../src/models/ContestNotification');
  const { ensureUnsubscribeToken } = require('../src/services/contestEmailService');
  const { processEmailJob } = require('../src/workers/emailWorker');
  const { addEmailJob } = require('../src/queues/emailQueue');

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
    // 1. Setup Test Users
    // -------------------------------------------------------------------------
    console.log('--- 1. Setting Up Test Users ---');
    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      admin = await User.create({
        name: 'AdminM5',
        email: 'admin_m5@example.com',
        password: 'password123',
        role: 'admin',
      });
    }

    let optedInUser = await User.findOne({ email: 'optedin_m5@example.com' });
    if (!optedInUser) {
      optedInUser = await User.create({
        name: 'OptedInUserM5',
        email: 'optedin_m5@example.com',
        password: 'password123',
        role: 'user',
        emailNotifications: true,
      });
    } else {
      optedInUser.emailNotifications = true;
      await optedInUser.save();
    }

    let optedOutUser = await User.findOne({ email: 'optedout_m5@example.com' });
    if (!optedOutUser) {
      optedOutUser = await User.create({
        name: 'OptedOutUserM5',
        email: 'optedout_m5@example.com',
        password: 'password123',
        role: 'user',
        emailNotifications: false,
      });
    } else {
      optedOutUser.emailNotifications = false;
      await optedOutUser.save();
    }

    const adminToken = jwt.sign({ id: admin._id }, process.env.JWT_SECRET || 'secret');
    const userToken = jwt.sign({ id: optedInUser._id }, process.env.JWT_SECRET || 'secret');
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    const userHeaders = { Authorization: `Bearer ${userToken}` };

    assert(admin && optedInUser && optedOutUser, 'Test users initialized');

    // -------------------------------------------------------------------------
    // 2. Unsubscribe Token Generation
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Unsubscribe Token Management ---');
    const token = await ensureUnsubscribeToken(optedInUser);
    assert(typeof token === 'string' && token.length >= 32, 'Generated secure 32+ hex unsubscribe token');

    const refreshedUser = await User.findById(optedInUser._id);
    assert(refreshedUser.unsubscribeToken === token, 'Unsubscribe token persisted on user record');

    // -------------------------------------------------------------------------
    // 3. One-Click Unsubscribe Endpoint
    // -------------------------------------------------------------------------
    console.log('\n--- 3. One-Click Unsubscribe Endpoint ---');
    // Call GET /api/contests/unsubscribe?token=... with JSON headers
    const unsubRes = await axios.get(`${API_BASE}/contests/unsubscribe?token=${token}`, {
      headers: { Accept: 'application/json' },
    });
    assert(unsubRes.status === 200, 'Unsubscribe endpoint returned 200 OK');
    assert(unsubRes.data.emailNotifications === false, 'Response confirms notifications disabled');

    const unsubUser = await User.findById(optedInUser._id);
    assert(unsubUser.emailNotifications === false, 'User record in MongoDB updated to emailNotifications: false');

    // Invalid token returns 404
    try {
      await axios.get(`${API_BASE}/contests/unsubscribe?token=nonexistenttoken999`, {
        headers: { Accept: 'application/json' },
      });
      assert(false, 'Expected 404 for invalid token');
    } catch (err) {
      assert(err.response?.status === 404, 'Invalid token correctly rejected with 404 Not Found');
    }

    // -------------------------------------------------------------------------
    // 4. Re-enable Notifications via Preferences Endpoint
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Toggle Notification Preferences ---');
    const toggleRes = await axios.post(
      `${API_BASE}/contests/notifications/preferences`,
      { enabled: true },
      { headers: userHeaders }
    );
    assert(toggleRes.status === 200, 'Toggle preferences returned 200 OK');
    assert(toggleRes.data.emailNotifications === true, 'Preferences toggled back to enabled');

    // Re-verify MongoDB state
    const reOptedUser = await User.findById(optedInUser._id);
    assert(reOptedUser.emailNotifications === true, 'User record in MongoDB restored to emailNotifications: true');

    // -------------------------------------------------------------------------
    // 5. Contest Announcement Dispatch & Opt-out Filtering
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Contest Announcement & Opt-out Filtering ---');
    // Clean up old notifications for test users
    await ContestNotification.deleteMany({
      userId: { $in: [optedInUser._id, optedOutUser._id] },
    });

    const startTime = new Date(Date.now() + 3600000 * 24); // Tomorrow
    const endTime = new Date(startTime.getTime() + 7200000);

    const contest = await Contest.create({
      title: 'M5 Announcement Contest',
      kind: 'public',
      type: 'dsa',
      scoring: 'icpc',
      createdBy: admin._id,
      startTime,
      durationMinutes: 120,
      endTime,
      selection: { mode: 'random', counts: { easy: 1, medium: 1, hard: 0 } },
      problems: [],
    });

    // Execute announcement job
    await processEmailJob({
      name: 'announce-contest',
      data: { contestId: contest._id },
    });

    // Verify opted-in user received notification record
    const optedInNotif = await ContestNotification.findOne({
      contestId: contest._id,
      userId: optedInUser._id,
      type: 'announce',
    });
    assert(optedInNotif !== null, 'ContestNotification created for opted-in user');
    assert(['sent', 'pending'].includes(optedInNotif?.status), 'Notification record has valid status');

    // Verify opted-out user was skipped
    const optedOutNotif = await ContestNotification.findOne({
      contestId: contest._id,
      userId: optedOutUser._id,
      type: 'announce',
    });
    assert(optedOutNotif === null, 'Opted-out user was correctly excluded from announcement');

    // -------------------------------------------------------------------------
    // 6. Idempotency Check (Duplicate Avoidance)
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Announcement Idempotency ---');
    const initialCount = await ContestNotification.countDocuments({
      contestId: contest._id,
      type: 'announce',
    });

    // Run announcement job again
    await processEmailJob({
      name: 'announce-contest',
      data: { contestId: contest._id },
    });

    const secondCount = await ContestNotification.countDocuments({
      contestId: contest._id,
      type: 'announce',
    });
    assert(initialCount === secondCount, 'Idempotency verified: re-running announcement does not duplicate records');

    // -------------------------------------------------------------------------
    // 7. Contest 1-Hour Reminder Dispatch
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Contest 1-Hour Reminder ---');
    // Register optedInUser as participant
    await ContestParticipant.findOneAndUpdate(
      { contestId: contest._id, userId: optedInUser._id },
      { contestId: contest._id, userId: optedInUser._id, joinedAt: new Date() },
      { upsert: true }
    );

    await processEmailJob({
      name: 'reminder-contest',
      data: { contestId: contest._id },
    });

    const reminderNotif = await ContestNotification.findOne({
      contestId: contest._id,
      userId: optedInUser._id,
      type: 'reminder',
    });
    assert(reminderNotif !== null, '1-Hour reminder notification created for registered participant');
    assert(['sent', 'pending'].includes(reminderNotif?.status), 'Reminder notification status verified');

    // -------------------------------------------------------------------------
    // 8. Contest Invitation Dispatch
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Contest Invitation by Code & Email ---');
    const privateContest = await Contest.create({
      title: 'M5 Private Duel',
      kind: 'private',
      type: 'dsa',
      scoring: 'icpc',
      createdBy: admin._id,
      startTime,
      durationMinutes: 90,
      endTime,
      joinCode: 'CODE8888',
      selection: { mode: 'random', counts: { easy: 1, medium: 0, hard: 0 } },
      problems: [],
    });

    // Invite optedInUser via API
    const inviteRes = await axios.post(
      `${API_BASE}/contests/${privateContest._id}/invite`,
      { emails: [optedInUser.email] },
      { headers: adminHeaders }
    );
    assert(inviteRes.status === 200, 'Invite endpoint returned 200 OK');
    assert(inviteRes.data.invitedCount === 1, 'Invited count is 1');

    const inviteNotif = await ContestNotification.findOne({
      contestId: privateContest._id,
      userId: optedInUser._id,
      type: 'invite',
    });
    assert(inviteNotif !== null, 'Invitation notification created in database');

    // Process invitation email job
    await processEmailJob({
      name: 'invite-contest',
      data: {
        contestId: privateContest._id,
        userId: optedInUser._id,
        inviterId: admin._id,
      },
    });

    const updatedInvite = await ContestNotification.findOne({
      contestId: privateContest._id,
      userId: optedInUser._id,
      type: 'invite',
    });
    assert(updatedInvite.status === 'sent', 'Invitation status updated to "sent"');

    // -------------------------------------------------------------------------
    // 9. Queue Fallback & Resiliency
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Queue Fallback Resiliency ---');
    const jobResult = await addEmailJob('test-queue-resiliency', { ping: true });
    assert(Boolean(jobResult), 'addEmailJob returned job acknowledgment seamlessly (in-process or BullMQ)');

    // -------------------------------------------------------------------------
    // Results
    // -------------------------------------------------------------------------
    console.log('\n======================================================');
    console.log(`📊 Result: ${passedTests}/${totalTests} tests passed.`);
    console.log('======================================================\n');

    if (passedTests === totalTests) {
      console.log('🎉 ALL MILESTONE 5 ACCEPTANCE CRITERIA VERIFIED!');
    }
  } catch (err) {
    console.error('Fatal test error:', err.response?.data || err.message);
  } finally {
    try {
      if (publicContest?._id || privateContest?._id) {
        await Contest.deleteMany({ _id: { $in: [publicContest?._id, privateContest?._id].filter(Boolean) } });
        await ContestNotification.deleteMany({ contestId: { $in: [publicContest?._id, privateContest?._id].filter(Boolean) } });
      }
    } catch (_) {}
    if (activeServer) {
      activeServer.close();
    }
    await mongoose.disconnect();
    setTimeout(() => process.exit(0), 500);
  }
}

verifyMilestone5();
