import { Worker, Job } from "bullmq";
import { EARN_QUEUE_NAME, EarnJobData } from "../queues/earnQueues.js";
import { processEarnEvent } from "../services/earnProcessor.js";
import { startWeeklyFinalizeScheduler } from "../scheduler/weeklyScheduler.js";

async function processEarnJob(job: Job<EarnJobData>) {
  const result = await processEarnEvent(job.data);

  console.log(
    `[worker] processed earn event: ${job.data.userId} +${job.data.amount} ` +
      `week=${result.weekId} applied=${result.applied}`,
  );
}

const worker = new Worker<EarnJobData>(
  EARN_QUEUE_NAME,
  async (job) => {
    await processEarnJob(job);
  },
  {
    connection: { url: process.env.REDIS_URL || "redis://localhost:6379" },
    concurrency: 10,
  },
);

worker.on("completed", (job) => {
  console.log(`[worker] job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[worker] job ${job?.id} failed:`, err.message);
});

console.log("[worker] listening for earn events...");

const weeklyFinalizeTask = startWeeklyFinalizeScheduler();

async function shutdown() {
  weeklyFinalizeTask.stop();
  await worker.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
