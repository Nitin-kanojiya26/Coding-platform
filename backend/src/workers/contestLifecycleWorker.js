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
  console.log(` [ContestLifecycleWorker] Processing job "${name}" for contest ${contestId}`);

  const contest = await Contest.findById(contestId);
  if (!contest) {
    console.warn(`[ContestLifecycleWorker] Contest ${contestId} not found, skipping.`);
    return;
  }

  if (contest.isCancelled) {
    console.log(`[ContestLifecycleWorker] Contest ${contestId} is cancelled, ignoring job.`);
    return;
  }

  if (name === 'contest-start') {
    // 1. If random mode, pick problems now
    if (contest.selection?.mode === 'random' && (!contest.problems || contest.problems.length === 0)) {
      console.log(`[ContestLifecycleWorker] Executing random problem selection for contest ${contestId}...`);
      await executeProblemSelection(contestId);
    }
    console.log(`[ContestLifecycleWorker] Contest "${contest.title}" (${contestId}) has officially started.`);
    try {
      const { emitContestStarted } = require('../sockets/contestSocket');
      emitContestStarted(contestId);
    } catch (_) {}
  } else if (name === 'contest-end') {
    console.log(`[ContestLifecycleWorker] Contest "${contest.title}" (${contestId}) has ended.`);
    try {
      const { emitContestEnded } = require('../sockets/contestSocket');
      emitContestEnded(contestId);
    } catch (_) {}

    // Milestone 6: Automatically compute LeetCode-style ratings upon contest conclusion
    try {
      const { applyContestRatings } = require('../services/contestRatingService');
      console.log(`[ContestLifecycleWorker] Computing post-contest ratings for contest ${contestId}...`);
      await applyContestRatings(contestId);
      console.log(`[ContestLifecycleWorker] Ratings successfully calculated for contest ${contestId}.`);
    } catch (ratingErr) {
      console.error(`[ContestLifecycleWorker] Error computing ratings for contest ${contestId}:`, ratingErr.message);
    }
  } else if (name === 'contest-reminder') {
    console.log(`[ContestLifecycleWorker] 1-hour reminder triggered for contest "${contest.title}" (${contestId}).`);
    try {
      const { addEmailJob } = require('../queues/emailQueue');
      await addEmailJob('reminder-contest', { contestId }, { priority: 2 });
    } catch (err) {
      console.warn(`[ContestLifecycleWorker] Failed to dispatch reminder job:`, err.message);
    }
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
  console.log(`[ContestLifecycleWorker] Job ${job.name} for contest ${job.data?.contestId} completed.`);
});

contestLifecycleWorker.on('failed', (job, err) => {
  console.error(`[ContestLifecycleWorker] Job ${job?.name} failed:`, err.message);
});

contestLifecycleWorker.on('error', (err) => {
  if (isBullMQAvailable()) {
    console.error(`[ContestLifecycleWorker] Worker connection error:`, err.message);
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
      console.log(`[ContestReconciler] Catching up random problem selection for contest ${c._id}`);
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

    // 3. Catch up rating computation for concluded contests that missed calculation
    const uncalculatedEnded = await Contest.find({
      isCancelled: false,
      endTime: { $lte: now },
      ratingsCalculatedAt: null,
    }).limit(10);

    for (const c of uncalculatedEnded) {
      console.log(`[ContestReconciler] Catching up ratings for concluded contest ${c._id}...`);
      try {
        const { applyContestRatings } = require('../services/contestRatingService');
        await applyContestRatings(c._id);
      } catch (err) {
        console.warn(`[ContestReconciler] Error calculating ratings for ${c._id}:`, err.message);
      }
    }
  } catch (err) {
    console.warn(`[ContestReconciler] Reconciliation sweep error:`, err.message);
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
