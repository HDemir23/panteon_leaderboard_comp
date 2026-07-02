import { earnQueue } from "../queues/earnQueues.js";
import { simulateEarnEvents } from "../services/simulateEarnEvents.js";

const EVENT_COUNT = Number(process.env.SIM_EVENT_COUNT ?? 2_000);
const USER_COUNT = Number(process.env.SIM_USER_COUNT ?? 2_000_000);
const MAX_AMOUNT = Number(process.env.SIM_MAX_AMOUNT ?? 5_000);

async function simulateOnce() {
  const result = await simulateEarnEvents({
    eventCount: EVENT_COUNT,
    userCount: USER_COUNT,
    maxAmount: MAX_AMOUNT,
  });

  console.log(
    `queued ${result.queuedEventCount} earn events for ${result.weekId}`,
  );
  console.log(
    `active users: ${result.activeUserCount} / ${result.totalUserCount}`,
  );
  console.log(`estimated earned amount: ${result.estimatedTotalAmount}`);
}

simulateOnce()
  .catch((err) => {
    console.error("simulation failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await earnQueue.close();
  });
