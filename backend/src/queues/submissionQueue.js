const { Queue, Worker } = require('bullmq');
const { bullmqConnection } = require('../config/bullmqredis');
const judge0Service = require('../services/judge0Service');
const Submission = require('../models/Submission');
const User = require('../models/Users');

// The Queue: Where incoming submissions are pushed
const submissionQueue = new Queue('code-submissions', {
    connection: bullmqConnection,
});

const workerConcurrency = Math.max(1, parseInt(process.env.WORKER_CONCURRENCY, 10) || 5);

// The Worker: Pulls jobs from Redis and executes them via Judge0 in the background
const submissionWorker = new Worker(
    'code-submissions',
    async (job) => {
        const { submissionId, code, languageId, testCases, timeLimit, userId, problemId } = job.data;
        console.log(`🚀 [BullMQ] Processing submission ${submissionId}`);

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
        }

        return result;
    },
    {
        connection: bullmqConnection.duplicate(),
        concurrency: workerConcurrency,
    }
);

submissionWorker.on('completed', (job) => {
    console.log(`✅ [BullMQ] Submission ${job.data.submissionId} finished with status: ${job.returnvalue?.status}`);
});

submissionWorker.on('failed', (job, err) => {
    console.error(`❌ [BullMQ] Submission ${job?.data?.submissionId} failed:`, err.message);
});

submissionWorker.on('error', (err) => {
    console.error(`⚠️ [BullMQ] Worker connection error:`, err.message);
});

submissionQueue.on('error', (err) => {
    console.error(`⚠️ [BullMQ] Queue connection error:`, err.message);
});

module.exports = { submissionQueue, submissionWorker };
