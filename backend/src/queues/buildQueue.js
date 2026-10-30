const { Queue, QueueEvents } = require('bullmq');
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
 console.error(' [BullMQ buildQueue] Queue connection error:', err.message);
  }
});

let queueEventsInstance = null;
function getQueueEvents() {
  if (!queueEventsInstance && bullmqConnection) {
    try {
      queueEventsInstance = new QueueEvents('api-judge', {
        connection: bullmqConnection.duplicate(),
      });
      queueEventsInstance.on('error', (err) => {
        if (isBullMQAvailable()) {
 console.error(' [BullMQ QueueEvents] Connection error:', err.message);
        }
      });
    } catch (e) {
 console.warn(' [BullMQ QueueEvents] Could not initialize QueueEvents:', e.message);
    }
  }
  return queueEventsInstance;
}

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
 console.warn(` [BuildQueue] BullMQ offline (${err.message}). Using in-process execution fallback.`);
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

/**
 * Execute an ephemeral Run Code evaluation via the BullMQ queue and wait for the result.
 * Used when running on cloud (Render) where Docker is executing remotely on the worker.
 */
async function executeBuildRunViaQueue(submission, problem, timeoutMs = 35000) {
  if (!isBullMQAvailable()) {
    throw new Error('Docker execution sandbox is offline (BullMQ queue unavailable).');
  }

  const qe = getQueueEvents();
  if (!qe) {
    throw new Error('Docker execution sandbox events listener unavailable.');
  }

  const job = await buildQueue.add(
    'evaluate-run',
    {
      submission: {
        _id: submission._id.toString(),
        userId: submission.userId?.toString(),
        problemId: problem._id.toString(),
        files: submission.files,
      },
      problem: {
        _id: problem._id.toString(),
        slug: problem.slug,
        title: problem.title,
        visibleTests: problem.visibleTests,
        limits: problem.limits,
      },
    },
    {
      priority: 1, // Highest priority for interactive test runs
      removeOnComplete: true,
      removeOnFail: true,
    }
  );

  return await job.waitUntilFinished(qe, timeoutMs);
}

module.exports = { buildQueue, addBuildJob, executeBuildRunViaQueue };
