const { Queue } = require('bullmq');
const { bullmqConnection } = require('../config/bullmqRedis');

// BullMQ Queue "api-judge" dedicated for Build Mode
const buildQueue = new Queue('api-judge', {
  connection: bullmqConnection,
  defaultJobOptions: {
    attempts: 1, // Strictly 1 attempt as required
    removeOnComplete: 100,
    removeOnFail: 100,
  },
});

buildQueue.on('error', (err) => {
  console.error('⚠️ [BullMQ buildQueue] Queue connection error:', err.message);
});

module.exports = { buildQueue };
