const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
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

async function verifyMilestone4() {
  console.log('======================================================');
  console.log('🧪 Verifying Milestone 4: Socket.IO Real-time Events');
  console.log('======================================================\n');

  let ioClient;
  try {
    ioClient = require('socket.io-client');
  } catch (err) {
    console.error('❌ "socket.io-client" is not installed yet.');
    console.log('👉 Please run: npm install socket.io socket.io-client\n');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/coding-platform');
  const User = require('../src/models/Users');
  const { emitStandingsUpdate, emitStatsUpdate, emitContestStarted, emitContestEnded, emitSubmissionUpdate } = require('../src/sockets/contestSocket');

  // Check if port 5000 is running; if not, spin up in-process server
  const isPort5000InUse = await checkPort(5000);
  let activeServer = null;
  let socketPort = 5000;

  if (!isPort5000InUse) {
    console.log('ℹ️ Server is not running on port 5000. Launching in-process test server...');
    const { server } = require('../src/server');
    socketPort = 5055;
    await new Promise((resolve) => {
      activeServer = server.listen(socketPort, resolve);
    });
    console.log(`🚀 In-process test server listening on port ${socketPort}`);
  }

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

  let testUser = await User.findOne({ role: 'admin' });
  if (!testUser) {
    testUser = await User.create({
      name: 'AdminSocketTest',
      email: 'adminsocket@example.com',
      password: 'password123',
      role: 'admin',
    });
  }
  const userToken = jwt.sign({ id: testUser._id }, process.env.JWT_SECRET || 'secret');

  const contestId = new mongoose.Types.ObjectId().toString();
  const socketUrl = `http://localhost:${socketPort}`;

  console.log(`Connecting Socket.IO client to ${socketUrl}...`);
  const clientSocket = ioClient.io(socketUrl, {
    auth: { token: userToken },
    transports: ['websocket', 'polling'],
    timeout: 5000,
  });

  const waitForEvent = (eventName, timeoutMs = 4000) => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for event "${eventName}" (${timeoutMs}ms)`));
      }, timeoutMs);

      clientSocket.once(eventName, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  };

  try {
    // 1. Connection check
    await new Promise((resolve, reject) => {
      clientSocket.on('connect', resolve);
      clientSocket.on('connect_error', reject);
      setTimeout(() => reject(new Error('Connection timeout to Socket.IO server')), 4000);
    });
    assert(clientSocket.connected, 'Socket.IO client connected successfully to backend');

    // 2. Join Contest Room
    const joinPromise = waitForEvent('joined:contest');
    clientSocket.emit('join:contest', { contestId });
    const joinData = await joinPromise;
    assert(joinData.contestId === contestId, `Joined contest room contest:${contestId}`);
    assert(joinData.authenticated === true, 'Socket identified authenticated user via JWT');

    // 3. Test standings:update event
    const standingsPromise = waitForEvent('standings:update');
    emitStandingsUpdate(contestId, {
      userId: testUser._id.toString(),
      standing: { rank: 1, score: 300, solvedCount: 2 },
    });
    const standingsData = await standingsPromise;
    assert(standingsData.contestId === contestId, 'Received standings:update event over WebSocket');
    assert(standingsData.standing?.score === 300, 'Standings payload contains updated scores');
    assert(typeof standingsData.timestamp === 'string', 'Standings payload includes ISO timestamp');

    // 4. Test stats:update event
    const statsPromise = waitForEvent('stats:update');
    emitStatsUpdate(contestId, { totalSubmissions: 42, acceptanceRate: 65 });
    const statsData = await statsPromise;
    assert(statsData.contestId === contestId, 'Received stats:update event over WebSocket');
    assert(statsData.stats?.totalSubmissions === 42, 'Stats payload accurately received');

    // 5. Test contest:started event
    const startedPromise = waitForEvent('contest:started');
    emitContestStarted(contestId);
    const startedData = await startedPromise;
    assert(startedData.contestId === contestId, 'Received contest:started event');
    assert(startedData.status === 'running', 'Contest status updated to "running" in real time');

    // 6. Test contest:ended event
    const endedPromise = waitForEvent('contest:ended');
    emitContestEnded(contestId);
    const endedData = await endedPromise;
    assert(endedData.contestId === contestId, 'Received contest:ended event');
    assert(endedData.status === 'ended', 'Contest status updated to "ended" in real time');

    // 7. Test private submission:update event
    const subPromise = waitForEvent('submission:update');
    emitSubmissionUpdate(contestId, testUser._id, {
      submissionId: 'sub_123',
      status: 'accepted',
      passedTestCases: 10,
      totalTestCases: 10,
    });
    const subData = await subPromise;
    assert(subData.submissionId === 'sub_123', 'Private submission:update received by target user');
    assert(subData.status === 'accepted', 'Submission status verified as accepted');

    console.log('\n======================================================');
    console.log(`📊 Result: ${passedTests}/${totalTests} tests passed.`);
    console.log('======================================================\n');

    if (passedTests === totalTests) {
      console.log('🎉 ALL MILESTONE 4 ACCEPTANCE CRITERIA VERIFIED!');
    }
  } catch (err) {
    console.error('Fatal Socket test error:', err.message);
  } finally {
    clientSocket.disconnect();
    if (activeServer) {
      activeServer.close();
    }
    await mongoose.disconnect();
    setTimeout(() => process.exit(0), 500);
  }
}

verifyMilestone4();
