const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Automatically reads the .env file from the backend root folder
const connectDB = require('./config/db');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Global process error guards to prevent unexpected background disconnects (like Redis) from crashing the server
process.on('unhandledRejection', (reason) => {
  console.warn('⚠️ [Process] Intercepted unhandled rejection:', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
  console.warn('⚠️ [Process] Intercepted uncaught exception:', err?.message || err);
});

const app = express();
const server = http.createServer(app);

// 1. Trust Reverse Proxy (Render, Railway, Fly, Nginx, Cloudflare, AWS)
app.set('trust proxy', 1);

// 2. Parse Allowed Origins for CORS and Socket.IO
const parseAllowedOrigins = () => {
  const clientUrl = process.env.CLIENT_URL;
  if (!clientUrl || clientUrl === '*' || clientUrl.trim() === '') return '*';
  return clientUrl.split(',').map((u) => u.trim());
};
const allowedOrigins = parseAllowedOrigins();

// 3. Initialize Socket.IO with CORS
try {
  const { Server } = require('socket.io');
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });
  const { initializeSocket } = require('./sockets/contestSocket');
  initializeSocket(io);
  console.log('[Socket.IO] Real-time engine initialized.');
} catch (err) {
  console.warn('[Socket.IO] Real-time engine failed to initialize:', err.message);
}

const { queryLocalStorage } = require('./config/db');
app.use((req, res, next) => {
  queryLocalStorage.run({ mongoQueries: 0 }, () => {
    next();
  });
});

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins === '*' ||
        (Array.isArray(allowedOrigins) && (allowedOrigins.includes('*') || allowedOrigins.includes(origin)))
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. Health Check Endpoint (used by Render, Railway, AWS, Fly, K8s, Uptime monitors)
app.get(['/health', '/api/health'], async (req, res) => {
  const mongoose = require('mongoose');
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const { isBullMQAvailable } = require('./config/bullmqRedis');
  const redisStatus = isBullMQAvailable() ? 'connected' : 'offline (in-process fallback active)';

  const health = {
    status: mongoStatus === 'connected' ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: mongoStatus,
      queueRedis: redisStatus,
    },
  };

  const statusCode = mongoStatus === 'connected' ? 200 : 503;
  return res.status(statusCode).json(health);
});

// 5. Mount Application Routes
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

// 6. Serve Production Frontend (Single-Service Deployment Mode)
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
const shouldServeFrontend =
  process.env.SERVE_FRONTEND === 'true' ||
  (process.env.NODE_ENV === 'production' && fs.existsSync(frontendDistPath));

if (shouldServeFrontend && fs.existsSync(frontendDistPath)) {
  console.log(`📦 [HostReady] Serving production frontend from: ${frontendDistPath}`);
  app.use(express.static(frontendDistPath));
  // Client-side SPA routing fallback (excludes /api, /uploads, /health, /socket.io)
  app.get('*', (req, res, next) => {
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/uploads') ||
      req.path.startsWith('/assets') ||
      req.path.startsWith('/health') ||
      req.path.startsWith('/socket.io')
    ) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// 7. Initialize Background Workers
require('./workers/buildWorker');
require('./workers/emailWorker');
const { reconcileContestLifecycle } = require('./workers/contestLifecycleWorker');

// 8. Graceful Shutdown Handlers
const gracefulShutdown = async (signal) => {
  console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    console.log('[Server] HTTP and Socket server closed.');
    try {
      const mongoose = require('mongoose');
      await mongoose.connection.close(false);
      console.log('[MongoDB] Connection closed cleanly.');
    } catch (_) { }
    process.exit(0);
  });

  setTimeout(() => {
    console.error('[Server] Forcefully shutting down after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 9. Start Server Listener
const PORT = process.env.PORT || 5000;
if (require.main === module) {
  connectDB().then(() => {
    // Startup reconciliation for scheduled contests
    reconcileContestLifecycle().catch((err) => {
      console.warn('Contest reconciliation warning:', err.message);
    });

    server.listen(PORT, () => {
      console.log(`[Server] Listening on port ${PORT} [Host-Ready]`);
      const judge0Service = require('./services/judge0Service');
      judge0Service.checkHealth().then((health) => {
        if (health.ok) {
          console.log(`[ExecutionEngine] Local Judge0: ONLINE (${process.env.JUDGE0_API_URL || 'http://localhost:2358'}) [Active: Primary Engine]`);
        } else {
          const hasOnlineKey = Boolean(process.env.ONLINECOMPILER_API_KEY);
          console.log(
            `[ExecutionEngine] Local Judge0: OFFLINE (${hasOnlineKey ? 'Active: OnlineCompiler.io Cloud API Fallback' : 'No Fallback: Please set ONLINECOMPILER_API_KEY in .env'})`
          );
        }
      }).catch(() => {});
    });
  });
}

module.exports = { app, server };
