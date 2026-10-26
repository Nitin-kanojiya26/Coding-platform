require('dotenv').config();
const Redis = require('ioredis');


let isBullMQConnected = false;
let hasLoggedOfflineWarning = false;

// BullMQ STRICTLY requires maxRetriesPerRequest: null
const connectionOptions = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6380,
  maxRetriesPerRequest: null, // Required by BullMQ to prevent crashes
  enableReadyCheck: false,
  enableOfflineQueue: false, // Prevent queuing commands indefinitely when Redis is offline
  retryStrategy(times) {
    if (times > 2) {
      if (!hasLoggedOfflineWarning) {
        console.warn('⚠️ [BullMQ] Redis is offline. Backend is operating with automatic in-process fallback mode (zero downtime).');
        hasLoggedOfflineWarning = true;
      }
      return 10000; // Quietly retry every 10 seconds
    }
    return Math.min(times * 500, 2000);
  },
};

// Dedicated ioredis instance for BullMQ
const bullmqConnection = new Redis(process.env.REDIS_QUEUE_URL || process.env.REDIS_URL || 'redis://127.0.0.1:6380', connectionOptions);

bullmqConnection.on('connect', () => {
  isBullMQConnected = true;
  hasLoggedOfflineWarning = false;
  console.log('⚡ BullMQ Redis Connection Established (Port 6380)');
});

bullmqConnection.on('ready', () => {
  isBullMQConnected = true;
});

bullmqConnection.on('close', () => {
  isBullMQConnected = false;
});

bullmqConnection.on('error', (err) => {
  isBullMQConnected = false;
  if (!hasLoggedOfflineWarning) {
    console.warn(`⚠️ [BullMQ] Redis is offline (${err.message}). In-process fallback is active.`);
    hasLoggedOfflineWarning = true;
  }
});

const isBullMQAvailable = () => {
  return isBullMQConnected && (bullmqConnection.status === 'ready' || bullmqConnection.status === 'connect');
};

module.exports = {
  connectionOptions,
  bullmqConnection,
  isBullMQAvailable,
};
