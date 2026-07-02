import { simulateEarnEvents } from "../services/simulateEarnEvents.js";

const DEFAULT_INTERVAL_MS = 5_000;
const DEFAULT_EVENTS_PER_TICK = 25;
const DEFAULT_USER_COUNT = 2_000_000;
const DEFAULT_MAX_AMOUNT = 5_000;
const DEFAULT_TRACKED_USER_ID = "user:19";

export interface EarnSimulationTask {
  enabled: boolean;
  stop: () => void;
}

function envInteger(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export function startEarnSimulationLoop(): EarnSimulationTask {
  if (process.env.EARN_SIMULATION_ENABLED === "false") {
    return { enabled: false, stop: () => undefined };
  }

  const intervalMs = envInteger(
    "EARN_SIMULATION_INTERVAL_MS",
    DEFAULT_INTERVAL_MS,
  );
  const eventCount = envInteger(
    "EARN_SIMULATION_EVENTS_PER_TICK",
    DEFAULT_EVENTS_PER_TICK,
  );
  const userCount = envInteger(
    "EARN_SIMULATION_USER_COUNT",
    DEFAULT_USER_COUNT,
  );
  const maxAmount = envInteger(
    "EARN_SIMULATION_MAX_AMOUNT",
    DEFAULT_MAX_AMOUNT,
  );
  const trackedUserId =
    process.env.EARN_SIMULATION_TRACKED_USER_ID || DEFAULT_TRACKED_USER_ID;
  let isRunning = false;

  const run = async () => {
    if (isRunning) {
      return;
    }

    isRunning = true;

    try {
      const result = await simulateEarnEvents({
        eventCount,
        userCount,
        maxAmount,
        trackedUserId,
        trackedUserAmount: 1,
      });

      console.log(
        `[simulation] queued ${result.queuedEventCount} events ` +
          `active=${result.activeUserCount} week=${result.weekId}`,
      );
    } catch (err) {
      console.error("[simulation] failed:", err);
    } finally {
      isRunning = false;
    }
  };

  void run();
  const timer: ReturnType<typeof setInterval> = setInterval(run, intervalMs);

  return {
    enabled: true,
    stop: () => {
      clearInterval(timer);
    },
  };
}
