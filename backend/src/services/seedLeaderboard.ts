import { redis } from "../config/redis.js";
import { getCurrentWeekId, leaderboardKeyForWeek } from "./leaderboardWeek.js";
import {
  leaderboardKeysForWeek,
  leaderboardRawScoresKeyForWeek,
  leaderboardTotalEarnedKeyForWeek,
  rankScoreForRawScore,
} from "./leaderboardScoring.js";

export interface SeedLeaderboardResult {
  weekId: string;
  playerCount: number;
  totalEarned: number;
}

export async function seedLeaderboard(
  playerCount = 50_000,
): Promise<SeedLeaderboardResult> {
  const weekId = getCurrentWeekId();
  const leaderboardKey = leaderboardKeyForWeek(weekId);
  const rawScoresKey = leaderboardRawScoresKeyForWeek(weekId);
  const totalEarnedKey = leaderboardTotalEarnedKeyForWeek(weekId);
  const normalizedPlayerCount = Math.max(1, Math.floor(playerCount));
  const pipeline = redis.pipeline();
  const now = Date.now();
  let totalEarned = 0;

  await redis.del(...leaderboardKeysForWeek(weekId));

  for (let i = 1; i <= normalizedPlayerCount; i++) {
    const userId = `user:${i}`;
    const rawScore = Math.floor(Math.random() * 100_000);
    const earnedAt =
      now - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000);
    const rankScore = rankScoreForRawScore(rawScore, earnedAt);

    totalEarned += rawScore;
    pipeline.hset(rawScoresKey, userId, rawScore);
    pipeline.zadd(leaderboardKey, rankScore, userId);
  }

  pipeline.set(totalEarnedKey, totalEarned);
  await pipeline.exec();

  return {
    weekId,
    playerCount: normalizedPlayerCount,
    totalEarned,
  };
}
