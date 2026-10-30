const { Queue } = require('bullmq');
const { bullmqConnection, isBullMQAvailable } = require('../config/bullmqRedis');

// Queue instance for email notifications
const emailQueue = new Queue('email-notifications', {
  connection: bullmqConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

emailQueue.on('error', (err) => {
  if (isBullMQAvailable()) {
 console.error(' [EmailQueue] Queue connection error:', err.message);
  }
});

/**
 * Dispatch an email notification job with safe automatic fallback:
 * If BullMQ/Redis is available, adds to the queue.
 * If offline, executes immediately in background via in-process fallback.
 */
async function addEmailJob(jobName, jobData, options = {}) {
  const priority = options.priority || 5;

  if (isBullMQAvailable()) {
    try {
      const jobPromise = emailQueue.add(jobName, jobData, { priority, ...options });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Email queue timeout')), 2000)
      );
      return await Promise.race([jobPromise, timeoutPromise]);
    } catch (err) {
 console.warn(` [EmailQueue] BullMQ offline (${err.message}). Using in-process execution fallback.`);
    }
  }

  // In-process background fallback
  setImmediate(() => {
    try {
      const { processEmailJob } = require('../workers/emailWorker');
      processEmailJob({ name: jobName, data: jobData }).catch((err) => {
 console.error(` [EmailQueue] In-process fallback error for "${jobName}":`, err.message);
      });
    } catch (err) {
 console.error(` [EmailQueue] Failed to run in-process worker:`, err.message);
    }
  });

  return { id: `in-proc-${Date.now()}`, name: jobName, data: jobData };
}

module.exports = {
  emailQueue,
  addEmailJob,
};
