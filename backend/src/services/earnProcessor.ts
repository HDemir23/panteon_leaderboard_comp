import { Collection } from "mongodb";
import { getMongoDb } from "../config/mongo.js";
import type { EarnJobData } from "../queues/earnQueues.js";
import { getWeekIdForEarnedAt } from "./earnWeek.js";
import { applyEarnToLeaderboard } from "./leaderboardScoring.js";

let earnEventsIndexPromise: Promise<string> | null = null;

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: number }).code === 11000
  );
}

async function getEarnEventsCollection(): Promise<Collection> {
  const db = await getMongoDb();
  const collection = db.collection("earn_events");

  earnEventsIndexPromise ??= collection.createIndex(
    { eventId: 1 },
    {
      unique: true,
      partialFilterExpression: { eventId: { $exists: true } },
    },
  );
  await earnEventsIndexPromise;

  return collection;
}

export async function processEarnEvent(data: EarnJobData) {
  const { eventId, userId, amount, earnedAt } = data;
  const weekId = getWeekIdForEarnedAt(earnedAt);

  const result = await applyEarnToLeaderboard({
    weekId,
    eventId,
    userId,
    amount,
    earnedAt,
  });

  const collection = await getEarnEventsCollection();

  try {
    await collection.insertOne({
      eventId,
      userId,
      amount,
      earnedAt: new Date(earnedAt),
      weekId,
      processedAt: new Date(),
    });
  } catch (err) {
    if (!isDuplicateKeyError(err)) {
      throw err;
    }
  }

  return {
    ...result,
    weekId,
  };
}
