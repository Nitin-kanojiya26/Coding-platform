const { Worker } = require('bullmq');
const { bullmqConnection, isBullMQAvailable } = require('../config/bullmqRedis');
const User = require('../models/Users');
const Contest = require('../models/Contest');
const ContestParticipant = require('../models/ContestParticipant');
const ContestNotification = require('../models/ContestNotification');
const {
  sendContestAnnouncement,
  sendContestReminder,
  sendContestInvitation,
} = require('../services/contestEmailService');

/**
 * Core job processor: executed by both BullMQ Worker and In-Process Fallback.
 */
async function processEmailJob(job) {
  const { name, data } = job;
  console.log(`[EmailWorker] Processing job "${name}"...`, data);

  if (name === 'announce-contest') {
    const { contestId } = data;
    const contest = await Contest.findById(contestId);
    if (!contest || contest.isCancelled) return;

    // Find all users who haven't opted out of emails
    const eligibleUsers = await User.find({
      emailNotifications: { $ne: false },
      isBanned: { $ne: true },
    }).select('name email unsubscribeToken');

    console.log(` [EmailWorker] Broadcasting announcement for "${contest.title}" to ${eligibleUsers.length} users.`);

    for (const user of eligibleUsers) {
      try {
        // Atomic idempotency check: only send if not already sent
        const notif = await ContestNotification.findOneAndUpdate(
          { contestId: contest._id, userId: user._id, type: 'announce' },
          {
            $setOnInsert: {
              contestId: contest._id,
              userId: user._id,
              type: 'announce',
              status: 'pending',
            },
          },
          { upsert: true, returnDocument: 'after' }
        );

        if (notif.status === 'sent') {
          continue; // Already dispatched
        }

        const res = await sendContestAnnouncement(contest, user);
        notif.status = res.success ? 'sent' : 'failed';
        notif.sentAt = new Date();
        await notif.save();
      } catch (err) {
        console.warn(`[EmailWorker] Failed announcement to ${user.email}:`, err.message);
      }
    }
  } else if (name === 'reminder-contest') {
    const { contestId } = data;
    const contest = await Contest.findById(contestId);
    if (!contest || contest.isCancelled) return;

    // Find all registered participants
    const participants = await ContestParticipant.find({ contestId: contest._id });
    const userIds = participants.map((p) => p.userId);

    const eligibleUsers = await User.find({
      _id: { $in: userIds },
      emailNotifications: { $ne: false },
    }).select('name email unsubscribeToken');

    console.log(`[EmailWorker] Sending 1-hour reminders for "${contest.title}" to ${eligibleUsers.length} participants.`);

    for (const user of eligibleUsers) {
      try {
        const notif = await ContestNotification.findOneAndUpdate(
          { contestId: contest._id, userId: user._id, type: 'reminder' },
          {
            $setOnInsert: {
              contestId: contest._id,
              userId: user._id,
              type: 'reminder',
              status: 'pending',
            },
          },
          { upsert: true, returnDocument: 'after' }
        );

        if (notif.status === 'sent') {
          continue;
        }

        const res = await sendContestReminder(contest, user);
        notif.status = res.success ? 'sent' : 'failed';
        notif.sentAt = new Date();
        await notif.save();
      } catch (err) {
        console.warn(`⚠️ [EmailWorker] Failed reminder to ${user.email}:`, err.message);
      }
    }
  } else if (name === 'invite-contest') {
    const { contestId, userId, inviterId } = data;
    const contest = await Contest.findById(contestId);
    const user = await User.findById(userId);
    const inviter = inviterId ? await User.findById(inviterId) : null;

    if (!contest || !user) return;

    // Respect opt-out preference
    if (user.emailNotifications === false) {
      console.log(`[EmailWorker] Skipping invitation email to ${user.email} (opted out).`);
      return;
    }

    try {
      const res = await sendContestInvitation(contest, user, inviter?.name || 'A teammate');
      await ContestNotification.findOneAndUpdate(
        { contestId: contest._id, userId: user._id, type: 'invite' },
        { status: res.success ? 'sent' : 'failed', sentAt: new Date() },
        { upsert: true }
      );
    } catch (err) {
      console.warn(`[EmailWorker] Failed invitation email to ${user.email}:`, err.message);
    }
  }
}

// BullMQ Worker for email-notifications
const emailWorker = new Worker(
  'email-notifications',
  async (job) => {
    return await processEmailJob(job);
  },
  {
    connection: bullmqConnection.duplicate(),
    concurrency: 5,
  }
);

emailWorker.on('completed', (job) => {
  console.log(`[EmailWorker] Finished email job "${job.name}".`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`[EmailWorker] Job "${job?.name}" failed:`, err.message);
});

emailWorker.on('error', (err) => {
  if (isBullMQAvailable()) {
    console.error(`[EmailWorker] Worker connection error:`, err.message);
  }
});

module.exports = {
  emailWorker,
  processEmailJob,
};
