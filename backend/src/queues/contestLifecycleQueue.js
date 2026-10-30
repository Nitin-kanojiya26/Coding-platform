const { Queue } = require('bullmq');
const { bullmqConnection, isBullMQAvailable } = require('../config/bullmqRedis');

// BullMQ Queue "contest-lifecycle"
const contestLifecycleQueue = new Queue('contest-lifecycle', {
  connection: bullmqConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: 100,
  },
});

contestLifecycleQueue.on('error', (err) => {
  if (isBullMQAvailable()) {
 console.error(' [BullMQ contestLifecycleQueue] Queue connection error:', err.message);
  }
});

/**
 * Schedule delayed BullMQ lifecycle jobs for a contest:
 * - Start job (triggers at startTime)
 * - End job (triggers at endTime)
 * - Reminder job (triggers 1 hour before startTime, if applicable)
 */
async function scheduleContestLifecycleJobs(contest) {
  if (!isBullMQAvailable()) {
    return;
  }

  try {
    const now = Date.now();
    const contestId = contest._id.toString();
    const startMs = new Date(contest.startTime).getTime();
    const endMs = new Date(contest.endTime).getTime();

    // 1. Contest Start Job
    const startDelay = Math.max(0, startMs - now);
    await contestLifecycleQueue.add(
      'contest-start',
      { contestId },
      {
        delay: startDelay,
        jobId: `contest:start:${contestId}`,
      }
    );

    // 2. Contest End Job
    const endDelay = Math.max(0, endMs - now);
    await contestLifecycleQueue.add(
      'contest-end',
      { contestId },
      {
        delay: endDelay,
        jobId: `contest:end:${contestId}`,
      }
    );

    // 3. 1-Hour Reminder Job (only if contest starts > 1 hour from now)
    const reminderMs = startMs - 60 * 60 * 1000;
    if (reminderMs > now) {
      const reminderDelay = reminderMs - now;
      await contestLifecycleQueue.add(
        'contest-reminder',
        { contestId },
        {
          delay: reminderDelay,
          jobId: `contest:reminder:${contestId}`,
        }
      );
    }
  } catch (err) {
 console.warn(` [ContestLifecycleQueue] Could not schedule jobs for contest ${contest._id}: ${err.message}`);
  }
}

/**
 * Cancel existing delayed BullMQ lifecycle jobs for a contest (e.g. on contest cancellation or update).
 */
async function cancelContestLifecycleJobs(contestId) {
  if (!isBullMQAvailable()) {
    return;
  }

  try {
    const jobIds = [
      `contest:start:${contestId}`,
      `contest:end:${contestId}`,
      `contest:reminder:${contestId}`,
    ];

    await Promise.all(
      jobIds.map(async (jId) => {
        try {
          const job = await contestLifecycleQueue.getJob(jId);
          if (job) {
            await job.remove();
          }
        } catch (_) {}
      })
    );
  } catch (err) {
 console.warn(` [ContestLifecycleQueue] Error removing jobs for contest ${contestId}: ${err.message}`);
  }
}

module.exports = {
  contestLifecycleQueue,
  scheduleContestLifecycleJobs,
  cancelContestLifecycleJobs,
};
