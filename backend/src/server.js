const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Automatically reads the .env file from the backend root folder
const connectDB = require('./config/db');
const path = require('path');
// Global process error guards to prevent unexpected background disconnects (like Redis) from crashing the server
process.on('unhandledRejection', (reason) => {
  console.warn('⚠️ [Process] Intercepted unhandled rejection:', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
  console.warn('⚠️ [Process] Intercepted uncaught exception:', err?.message || err);
});

const http = require('http');
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS
try {
  const { Server } = require('socket.io');
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });
  const { initializeSocket } = require('./sockets/contestSocket');
  initializeSocket(io);
  console.log('⚡ [Socket.IO] Real-time engine initialized.');
} catch (err) {
  console.warn('⚠️ [Socket.IO] socket.io package not loaded yet. Live updates will activate once npm install socket.io is run.');
}

app.use(cors()); // Allows our React frontend to communicate with this API
app.use(express.json()); 

// 3. Mount Application Routes
app.use(express.urlencoded({ extended: true }));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/problems', require('./routes/problemRoutes'));
app.use('/api/submissions', require('./routes/submissionRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/leaderboard', require('./routes/leaderboardRoutes'));
app.use('/api/sheets', require('./routes/sheetRoutes'));
app.use('/api/build', require('./routes/buildRoutes'));
app.use('/api/contests', require('./routes/contestRoutes'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Initialize Background Workers
require('./workers/buildWorker');
require('./workers/emailWorker');
const { reconcileContestLifecycle } = require('./workers/contestLifecycleWorker');

// 5. Start Server Listener
const PORT = process.env.PORT || 5000;
if (require.main === module) {
  connectDB().then(() => {
    // Startup reconciliation for scheduled contests
    reconcileContestLifecycle().catch((err) => {
      console.warn('⚠️ Contest reconciliation warning:', err.message);
    });

    server.listen(PORT, () => {
      console.log(`🚀 Server spinning up on port ${PORT}`);
    });
  });
}

module.exports = { app, server };
