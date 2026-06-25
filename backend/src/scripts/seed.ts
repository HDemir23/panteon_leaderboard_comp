import { redis } from "../config/redis.js";
import {
  getCurrentWeekId,
  leaderboardKeyForWeek,
} from "../services/leaderboardWeek.js";
import {
  leaderboardKeysForWeek,
  leaderboardRawScoresKeyForWeek,
  leaderboardTotalEarnedKeyForWeek,
  rankScoreForRawScore,
} from "../services/leaderboardScoring.js";

const PLAYER_COUNT = 50_000;
const WEEK_ID = getCurrentWeekId();
const LEADERBOARD_KEY = leaderboardKeyForWeek(WEEK_ID);
const RAW_SCORES_KEY = leaderboardRawScoresKeyForWeek(WEEK_ID);
const TOTAL_EARNED_KEY = leaderboardTotalEarnedKeyForWeek(WEEK_ID);

/**
 * Tie-break strategy:
 * Redis ZSET breaks ties between equal scores lexicographically by member ID,
 * which is meaningless for "who earned this score first".
 * The sorted-set score is rank-only; display and rewards use the raw score hash.
 */
async function seed() {
  console.log(`seeding ${PLAYER_COUNT} players into ${LEADERBOARD_KEY}...`);

  await redis.del(...leaderboardKeysForWeek(WEEK_ID)); // clean slate for repeatable testing

  const pipeline = redis.pipeline();
  const now = Date.now();
  let totalEarned = 0;

  for (let i = 1; i <= PLAYER_COUNT; i++) {
    const userId = `user:${i}`;
    const rawScore = Math.floor(Math.random() * 100_000);
    const earnedAt = now - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000); // sometime in the last week
    const score = rankScoreForRawScore(rawScore, earnedAt);

    totalEarned += rawScore;
    pipeline.hset(RAW_SCORES_KEY, userId, rawScore);
    pipeline.zadd(LEADERBOARD_KEY, score, userId);
  }

  pipeline.set(TOTAL_EARNED_KEY, totalEarned);
  await pipeline.exec();

  const total = await redis.zcard(LEADERBOARD_KEY);
  console.log(`done. ${total} players in leaderboard.`);

  const top5 = await redis.zrevrange(LEADERBOARD_KEY, 0, 4, "WITHSCORES");
  console.log("top 5:", top5);

  process.exit(0);
}

seed().catch((err) => {
  console.error("seed failed:", err);
  process.exit(1);
});
