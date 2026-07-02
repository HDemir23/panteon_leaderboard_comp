import { randomUUID } from "crypto";
import { earnQueue, type EarnJobData } from "../queues/earnQueues.js";
import { getCurrentWeekId } from "./leaderboardWeek.js";

const DEFAULT_TOTAL_USER_COUNT = 2_000_000;
const MAX_TOTAL_USER_COUNT = 2_000_000;
const DEFAULT_EVENT_COUNT = 2_000;
const MAX_EVENT_COUNT = 10_000;
const DEFAULT_MAX_AMOUNT = 5_000;
const MAX_AMOUNT = 100_000;
const MAX_SIMULATED_TOTAL_AMOUNT = 1_000_000_000;
const EVENT_WINDOW_MS = 10 * 60 * 1000;
const QUEUE_BATCH_SIZE = 500;

export interface SimulateEarnEventsOptions {
  eventCount?: number;
  userCount?: number;
  maxAmount?: number;
  trackedUserId?: string;
  trackedUserAmount?: number;
}

export interface SimulateEarnEventsResult {
  weekId: string;
  totalUserCount: number;
  activeUserCount: number;
  queuedEventCount: number;
  maxAmount: number;
  estimatedTotalAmount: number;
}

function boundedInteger(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.floor(value)));
}

function randomInteger(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export async function simulateEarnEvents(
  options: SimulateEarnEventsOptions = {},
): Promise<SimulateEarnEventsResult> {
  const totalUserCount = boundedInteger(
    options.userCount,
    DEFAULT_TOTAL_USER_COUNT,
    1,
    MAX_TOTAL_USER_COUNT,
  );
  const eventCount = boundedInteger(
    options.eventCount,
    DEFAULT_EVENT_COUNT,
    1,
    MAX_EVENT_COUNT,
  );
  const maxSafeAmount = Math.max(
    1,
    Math.floor(MAX_SIMULATED_TOTAL_AMOUNT / eventCount),
  );
  const maxAmount = boundedInteger(
    options.maxAmount,
    DEFAULT_MAX_AMOUNT,
    1,
    Math.min(MAX_AMOUNT, maxSafeAmount),
  );
  const now = Date.now();
  const activeUsers = new Set<string>();
  const trackedUserId = options.trackedUserId?.trim();
  const trackedUserAmount = boundedInteger(
    options.trackedUserAmount,
    1,
    1,
    maxAmount,
  );
  let queuedEventCount = 0;
  let estimatedTotalAmount = 0;
  let trackedUserQueued = false;

  while (queuedEventCount < eventCount) {
    const batchSize = Math.min(QUEUE_BATCH_SIZE, eventCount - queuedEventCount);
    const jobs = Array.from({ length: batchSize }, () => {
      const eventId = randomUUID();
      const isTrackedUserEvent = Boolean(trackedUserId) && !trackedUserQueued;
      const userId =
        isTrackedUserEvent && trackedUserId
          ? trackedUserId
          : `user:${randomInteger(1, totalUserCount)}`;
      const amount = isTrackedUserEvent
        ? trackedUserAmount
        : randomInteger(1, maxAmount);
      const earnedAt = now - randomInteger(0, EVENT_WINDOW_MS);
      const data: EarnJobData = { eventId, userId, amount, earnedAt };

      trackedUserQueued ||= isTrackedUserEvent;
      activeUsers.add(userId);
      estimatedTotalAmount += amount;

      return {
        name: "earn-event",
        data,
        opts: { jobId: eventId },
      };
    });

    await earnQueue.addBulk(jobs);
    queuedEventCount += batchSize;
  }

  return {
    weekId: getCurrentWeekId(new Date(now)),
    totalUserCount,
    activeUserCount: activeUsers.size,
    queuedEventCount,
    maxAmount,
    estimatedTotalAmount,
  };
}
