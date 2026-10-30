const { Queue, Worker } = require('bullmq');
const { bullmqConnection, isBullMQAvailable } = require('../config/bullmqRedis');
const judge0Service = require('../services/judge0Service');
const Submission = require('../models/Submission');
const User = require('../models/Users');

// The Queue: Where incoming submissions are pushed
const submissionQueue = new Queue('code-submissions', {
    connection: bullmqConnection,
    defaultJobOptions: {
        attempts: 1,
        removeOnComplete: 100,
        removeOnFail: 100,
    },
});

const workerConcurrency = Math.max(1, parseInt(process.env.WORKER_CONCURRENCY, 10) || 5);

/**
 * Core submission processor - executes code via Judge0 and updates MongoDB
 * Used both by the BullMQ worker and directly when Redis is offline.
 */
async function processSubmissionDirectly(jobData) {
    const { submissionId, code, languageId, testCases, timeLimit, userId, problemId } = jobData;
 console.log(` [SubmissionRunner] Processing submission ${submissionId}`);

    try {
        // Run code through Judge0
        const result = await judge0Service.runAllTestCases(
            code,
            languageId,
            testCases,
            timeLimit || 2000
        );

        // Update Submission record in MongoDB
        const submission = await Submission.findById(submissionId);
        if (submission) {
            submission.status = result.status;
            submission.runtime = result.runtime;
            submission.memory = result.memory;
            submission.passedTestCases = result.passed;
            submission.totalTestCases = result.total;
            if (result.compile_output || result.stderr) {
                submission.errorLog = result.compile_output || result.stderr;
            }
            await submission.save();

            // If accepted, add problem to user's solvedProblems
            if (result.status === 'accepted') {
                await User.findByIdAndUpdate(
                    userId,
                    { $addToSet: { solvedProblems: problemId } },
                    { new: true }
                );
            }

            // If part of a contest, recalculate standing and update live leaderboard
            if (submission.contestId) {
                try {
                    const { updateUserContestStanding } = require('../services/contestLeaderboardService');
                    updateUserContestStanding(submission.contestId, userId).catch((stErr) => {
 console.warn(` Error updating contest standing for user ${userId}:`, stErr.message);
                    });

                    const { emitSubmissionUpdate } = require('../sockets/contestSocket');
                    emitSubmissionUpdate(submission.contestId, userId, {
                        submissionId: submission._id,
                        problemId,
                        status: submission.status,
                        passedTestCases: submission.passedTestCases,
                        totalTestCases: submission.totalTestCases,
                        runtime: submission.runtime,
                        memory: submission.memory,
                    });
                } catch (_) {}
            }
        }

        return result;
    } catch (err) {
 console.error(` [SubmissionRunner] Error processing ${submissionId}:`, err.message);
        const isUnavailable =
            err.isServiceUnavailable ||
            err.code === 'ECONNREFUSED' ||
            err.message?.toLowerCase().includes('offline') ||
            err.message?.includes('ECONNREFUSED');

        const friendlyError = isUnavailable
            ? 'The code execution engine is temporarily offline. Your submission has been saved. Please try submitting again in a moment.'
            : (err.friendlyMessage || err.message || 'Execution error');

        try {
            const updated = await Submission.findByIdAndUpdate(
                submissionId,
                {
                    status: 'error',
                    errorLog: friendlyError,
                },
                { new: true }
            );

            // Broadcast error status to contest participants immediately so client does not hang
            if (updated && updated.contestId) {
                try {
                    const { emitSubmissionUpdate } = require('../sockets/contestSocket');
                    emitSubmissionUpdate(updated.contestId, userId, {
                        submissionId: updated._id,
                        problemId,
                        status: 'error',
                        errorLog: friendlyError,
                        passedTestCases: 0,
                        totalTestCases: testCases?.length || 0,
                        runtime: 0,
                        memory: 0,
                    });
                } catch (_) {}
            }
        } catch (_) {}
    }
}

// The Worker: Pulls jobs from Redis and executes them via Judge0 in the background
const submissionWorker = new Worker(
    'code-submissions',
    async (job) => {
        return await processSubmissionDirectly(job.data);
    },
    {
        connection: bullmqConnection.duplicate(),
        concurrency: workerConcurrency,
    }
);

let completedJobsCount = 0;

submissionWorker.on('completed', (job) => {
    completedJobsCount++;
 console.log(` [BullMQ] Submission ${job.data?.submissionId} finished with status: ${job.returnvalue?.status}`);
});

function getCompletedJobCount() {
    return completedJobsCount;
}

function resetCompletedJobCount() {
    completedJobsCount = 0;
    return completedJobsCount;
}

submissionWorker.on('failed', (job, err) => {
 console.error(` [BullMQ] Submission ${job?.data?.submissionId} failed:`, err.message);
});

submissionWorker.on('error', (err) => {
    // Quietly log worker connection errors without throwing
    if (isBullMQAvailable()) {
 console.error(` [BullMQ] Worker connection error:`, err.message);
    }
});

submissionQueue.on('error', (err) => {
    // Quietly log queue connection errors without throwing
    if (isBullMQAvailable()) {
 console.error(` [BullMQ] Queue connection error:`, err.message);
    }
});

/**
 * Safe submission dispatcher with automatic fallback:
 * If Redis / BullMQ is available, dispatches to queue.
 * If Redis / BullMQ is offline, runs in-process immediately in background (zero downtime).
 */
async function addSubmissionJob(jobData, options = {}) {
    const priority = options.priority || (jobData.contestId ? 1 : 10);
    if (isBullMQAvailable()) {
        try {
            const jobPromise = submissionQueue.add('execute-submission', jobData, { priority });
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Queue timeout')), 2000)
            );
            return await Promise.race([jobPromise, timeoutPromise]);
        } catch (err) {
 console.warn(` [SubmissionQueue] BullMQ offline (${err.message}). Using in-process execution fallback.`);
        }
    }

    // Fallback: Run in background via setImmediate
    setImmediate(() => {
        processSubmissionDirectly(jobData).catch((err) => {
            console.error('Unhandled in-process submission error:', err);
        });
    });

    return { id: `in-process-${jobData.submissionId}`, isFallback: true };
}

function setWorkerConcurrency(concurrency) {
    const val = Math.max(1, parseInt(concurrency, 10) || 5);
    submissionWorker.concurrency = val;
    return submissionWorker.concurrency;
}

function getWorkerConcurrency() {
    return submissionWorker.concurrency;
}

module.exports = {
    submissionQueue,
    submissionWorker,
    addSubmissionJob,
    processSubmissionDirectly,
    setWorkerConcurrency,
    getWorkerConcurrency,
    getCompletedJobCount,
    resetCompletedJobCount,
};
