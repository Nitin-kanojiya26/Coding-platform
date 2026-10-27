const { Queue } = require('bullmq');
const { bullmqConnection, isBullMQAvailable } = require('../config/bullmqRedis');

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
  if (isBullMQAvailable()) {
    console.error('⚠️ [BullMQ buildQueue] Queue connection error:', err.message);
  }
});

/**
 * Safe build job dispatcher with automatic fallback:
 * If Redis / BullMQ is available, pushes job to BullMQ queue.
 * If Redis / BullMQ is offline, runs in-process immediately in background (zero downtime).
 */
async function addBuildJob(submissionId, options = {}) {
  const priority = options.priority || 10;
  if (isBullMQAvailable()) {
    try {
      const jobPromise = buildQueue.add(
        'evaluate-submission',
        { submissionId },
        { priority }
      );
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Queue timeout')), 2000)
      );
      return await Promise.race([jobPromise, timeoutPromise]);
    } catch (err) {
      console.warn(`⚠️ [BuildQueue] BullMQ offline (${err.message}). Using in-process execution fallback.`);
    }
  }

  // Fallback: Run in background via setImmediate
  const { processBuildSubmissionDirectly } = require('../workers/buildWorker');
  setImmediate(() => {
    processBuildSubmissionDirectly(submissionId).catch((err) => {
      console.error('Unhandled in-process build submission error:', err);
    });
  });

  return { id: `in-process-${submissionId}`, isFallback: true };
}

module.exports = { buildQueue, addBuildJob };
