const { Worker } = require('bullmq');
const { bullmqConnection, isBullMQAvailable } = require('../config/bullmqRedis');
const Contest = require('../models/Contest');
const { executeProblemSelection } = require('../services/contestSelectionService');
const { scheduleContestLifecycleJobs } = require('../queues/contestLifecycleQueue');

/**
 * Handles execution of a lifecycle job for a contest.
 */
async function processLifecycleJob(job) {
  const { contestId } = job.data;
  const name = job.name;
  console.log(`⏱️ [ContestLifecycleWorker] Processing job "${name}" for contest ${contestId}`);

  const contest = await Contest.findById(contestId);
  if (!contest) {
    console.warn(`⚠️ [ContestLifecycleWorker] Contest ${contestId} not found, skipping.`);
    return;
  }

  if (contest.isCancelled) {
    console.log(`ℹ️ [ContestLifecycleWorker] Contest ${contestId} is cancelled, ignoring job.`);
    return;
  }

  if (name === 'contest-start') {
    // 1. If random mode, pick problems now
    if (contest.selection?.mode === 'random' && (!contest.problems || contest.problems.length === 0)) {
      console.log(`🎲 [ContestLifecycleWorker] Executing random problem selection for contest ${contestId}...`);
      await executeProblemSelection(contestId);
    }
    console.log(`🚀 [ContestLifecycleWorker] Contest "${contest.title}" (${contestId}) has officially started.`);
    // Global Socket.IO notification hook (will be populated in Milestone 4)
    if (global.io) {
      global.io.emit('contest:started', { contestId });
    }
  } else if (name === 'contest-end') {
    console.log(`🏁 [ContestLifecycleWorker] Contest "${contest.title}" (${contestId}) has ended.`);
    if (global.io) {
      global.io.emit('contest:ended', { contestId });
    }
  } else if (name === 'contest-reminder') {
    console.log(`⏰ [ContestLifecycleWorker] 1-hour reminder triggered for contest "${contest.title}" (${contestId}).`);
    // Mail notifications will be dispatched here in Milestone 5
  }
}

// BullMQ Worker for contest-lifecycle
const contestLifecycleWorker = new Worker(
  'contest-lifecycle',
  async (job) => {
    return await processLifecycleJob(job);
  },
  {
    connection: bullmqConnection.duplicate(),
    concurrency: 5,
  }
);

contestLifecycleWorker.on('completed', (job) => {
  console.log(`✅ [ContestLifecycleWorker] Job ${job.name} for contest ${job.data?.contestId} completed.`);
});

contestLifecycleWorker.on('failed', (job, err) => {
  console.error(`❌ [ContestLifecycleWorker] Job ${job?.name} failed:`, err.message);
});

contestLifecycleWorker.on('error', (err) => {
  if (isBullMQAvailable()) {
    console.error(`⚠️ [ContestLifecycleWorker] Worker connection error:`, err.message);
  }
});

/**
 * Startup Reconciliation & Safety Sweep:
 * 1. Checks for any started contests whose random problems were not yet selected.
 * 2. Re-schedules delayed jobs for future scheduled contests.
 */
async function reconcileContestLifecycle() {
  try {
    const now = new Date();

    // 1. Recover unselected random problems for contests that have started
    const unpickedContests = await Contest.find({
      isCancelled: false,
      startTime: { $lte: now },
      endTime: { $gt: now },
      'selection.mode': 'random',
      $or: [{ problems: { $size: 0 } }, { problems: { $exists: false } }],
    });

    for (const c of unpickedContests) {
      console.log(`🔄 [ContestReconciler] Catching up random problem selection for contest ${c._id}`);
      await executeProblemSelection(c._id);
    }

    // 2. Ensure delayed jobs are scheduled for all future scheduled contests
    const upcomingContests = await Contest.find({
      isCancelled: false,
      startTime: { $gt: now },
    });

    for (const c of upcomingContests) {
      await scheduleContestLifecycleJobs(c);
    }
  } catch (err) {
    console.warn(`⚠️ [ContestReconciler] Reconciliation sweep error:`, err.message);
  }
}

// Run periodic safety sweep every 60 seconds
const sweepInterval = setInterval(() => {
  reconcileContestLifecycle().catch(() => {});
}, 60 * 1000);
if (sweepInterval.unref) {
  sweepInterval.unref(); // Allows process to exit cleanly during tests
}

module.exports = {
  contestLifecycleWorker,
  processLifecycleJob,
  reconcileContestLifecycle,
};
