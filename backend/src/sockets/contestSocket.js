const jwt = require('jsonwebtoken');
const User = require('../models/Users');

let ioInstance = null;

// Debounce map for standings updates per contest (avoids overwhelming clients during high submission bursts)
const standingsDebounceTimers = new Map();
const DEBOUNCE_INTERVAL_MS = 800; // max 1 broadcast every 800ms per contest

/**
 * Socket.IO Authentication Middleware.
 * Reads token from handshake auth or Authorization header.
 * Allows anonymous viewers (marked as guest) while attaching user doc for authenticated participants.
 */
async function socketAuthMiddleware(socket, next) {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      // Allow unauthenticated guest connections for public leaderboard viewing
      socket.user = null;
      socket.isGuest = true;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.id).select('-password');
    if (user && !user.isBanned) {
      socket.user = user;
      socket.isGuest = false;
    } else {
      socket.user = null;
      socket.isGuest = true;
    }
    next();
  } catch (err) {
    // If token invalid, still allow guest view
    socket.user = null;
    socket.isGuest = true;
    next();
  }
}

/**
 * Initialize Socket.IO with server instance.
 */
function initializeSocket(io) {
  ioInstance = io;
  global.io = io;

  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    const userName = socket.user?.name || 'Guest';
 console.log(` [Socket.IO] Client connected: ${socket.id} (${userName})`);

    // 1. Join Contest Room
    socket.on('join:contest', async (data, ackCallback) => {
      const contestId = typeof data === 'object' ? data?.contestId : data;
      if (!contestId) return;

      const room = `contest:${contestId}`;
      socket.join(room);
 console.log(` [Socket.IO] ${socket.id} joined ${room}`);

      // If authenticated user, also join their private user room for this contest
      let finishedSubmissions = [];
      if (socket.user?._id) {
        const userRoom = `contest:${contestId}:user:${socket.user._id}`;
        socket.join(userRoom);

        // When a client joins its room, send the current status of any of its submissions that are already finished
        try {
          const Submission = require('../models/Submission');
          finishedSubmissions = await Submission.find({
            contestId,
            user: socket.user._id,
            status: { $in: ['accepted', 'wrong_answer', 'time_limit_exceeded', 'memory_limit_exceeded', 'runtime_error', 'compilation_error', 'error'] },
          })
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

          // Push already finished submissions to the client immediately
          for (const sub of finishedSubmissions) {
            socket.emit('submission:update', {
              contestId: contestId.toString(),
              userId: socket.user._id.toString(),
              submissionId: sub._id,
              problemId: sub.problem,
              status: sub.status,
              passedTestCases: sub.passedTestCases,
              totalTestCases: sub.totalTestCases,
              runtime: sub.runtime,
              memory: sub.memory,
              timestamp: sub.updatedAt || sub.createdAt,
            });
          }
        } catch (_) {}
      }

      const ackPayload = {
        contestId,
        room,
        authenticated: !socket.isGuest,
        finishedCount: finishedSubmissions.length,
      };

      socket.emit('joined:contest', ackPayload);
      if (typeof ackCallback === 'function') {
        ackCallback(ackPayload);
      }
    });

    // 2. Leave Contest Room
    socket.on('leave:contest', (data) => {
      const contestId = typeof data === 'object' ? data?.contestId : data;
      if (!contestId) return;

      const room = `contest:${contestId}`;
      socket.leave(room);
      if (socket.user?._id) {
        socket.leave(`contest:${contestId}:user:${socket.user._id}`);
      }
 console.log(` [Socket.IO] ${socket.id} left ${room}`);
    });

    socket.on('disconnect', (reason) => {
 console.log(` [Socket.IO] Client disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}

/**
 * Emit real-time standings update to contest room with debouncing.
 */
function emitStandingsUpdate(contestId, payload) {
  if (!ioInstance) return;

  const key = contestId.toString();

  // If a debounce timer is running, let it flush the latest payload
  if (standingsDebounceTimers.has(key)) {
    standingsDebounceTimers.set(key, { payload, timer: standingsDebounceTimers.get(key).timer });
    return;
  }

  // Immediate send for responsiveness
  ioInstance.to(`contest:${key}`).emit('standings:update', {
    contestId: key,
    ...payload,
    timestamp: new Date().toISOString(),
  });

  // Start cooldown timer before next broadcast
  const timer = setTimeout(() => {
    const pending = standingsDebounceTimers.get(key);
    standingsDebounceTimers.delete(key);

    if (pending && pending.payload !== payload) {
      ioInstance.to(`contest:${key}`).emit('standings:update', {
        contestId: key,
        ...pending.payload,
        timestamp: new Date().toISOString(),
      });
    }
  }, DEBOUNCE_INTERVAL_MS);

  if (timer.unref) timer.unref();
  standingsDebounceTimers.set(key, { payload, timer });
}

/**
 * Emit contest statistics update (total submissions, acceptance rates).
 */
function emitStatsUpdate(contestId, stats) {
  if (!ioInstance) return;
  const key = contestId.toString();
  ioInstance.to(`contest:${key}`).emit('stats:update', {
    contestId: key,
    stats,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit contest start event (reveals/unlocks problems on all participants' screens simultaneously).
 */
function emitContestStarted(contestId) {
  if (!ioInstance) return;
  const key = contestId.toString();
  ioInstance.to(`contest:${key}`).emit('contest:started', {
    contestId: key,
    status: 'running',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit contest end event (freezes editor and standings).
 */
function emitContestEnded(contestId) {
  if (!ioInstance) return;
  const key = contestId.toString();
  ioInstance.to(`contest:${key}`).emit('contest:ended', {
    contestId: key,
    status: 'ended',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit private submission status change to specific user room.
 */
function emitSubmissionUpdate(contestId, userId, submissionData) {
  if (!ioInstance) return;
  const cKey = contestId.toString();
  const uKey = userId.toString();
  ioInstance.to(`contest:${cKey}:user:${uKey}`).emit('submission:update', {
    contestId: cKey,
    userId: uKey,
    ...submissionData,
    timestamp: new Date().toISOString(),
  });
}

function getIO() {
  return ioInstance;
}

module.exports = {
  initializeSocket,
  emitStandingsUpdate,
  emitStatsUpdate,
  emitContestStarted,
  emitContestEnded,
  emitSubmissionUpdate,
  getIO,
};
