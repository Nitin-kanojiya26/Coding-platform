require('dotenv').config();
const Redis = require('ioredis');


// BullMQ STRICTLY requires maxRetriesPerRequest: null
const connectionOptions = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6380,
  maxRetriesPerRequest: null, // Required by BullMQ to prevent crashes
  enableReadyCheck: false,
};

// dedicated ioredis instance for BullMQ
const bullmqConnection = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6380', connectionOptions);

bullmqConnection.on('connect', () => {
  console.log('⚡ BullMQ Redis Connection Established (Port 6380)');
});

bullmqConnection.on('error', (err) => {
  console.error('❌ BullMQ Redis Connection Error:', err.message);
});

module.exports = {
  connectionOptions,
  bullmqConnection,
};
