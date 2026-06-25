import { leaderboardKeyForWeek } from "./leaderboardWeek.js";

const describeWeeklyIntegration =
  process.env.WEEKLY_INTEGRATION === "1" ? describe : describe.skip;

const DEFAULT_PLAYER_COUNT = 50_000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const PLAYER_COUNT = Number(
  process.env.WEEKLY_TEST_PLAYERS ?? DEFAULT_PLAYER_COUNT,
);
const WEEK_ID = `weekly-finalizer-jest-${Date.now()}-${process.pid}`;
const LOCK_WEEK_ID = `${WEEK_ID}-lock`;
const SCORE_WEEK_ID = `${WEEK_ID}-scores`;

let redis: typeof import("../config/redis.js").redis;
let pgPool: typeof import("../config/postgres.js").pgPool;
let setupWeeklyTables: typeof import("../scripts/setupWeeklyTables.js").setupWeeklyTables;
let finalizeWeeklyLeaderboard: typeof import("./weeklyFinalizer.js").finalizeWeeklyLeaderboard;
let applyEarnToLeaderboard: typeof import("./leaderboardScoring.js").applyEarnToLeaderboard;
let leaderboardKeysForWeek: typeof import("./leaderboardScoring.js").leaderboardKeysForWeek;
let leaderboardRawScoresKeyForWeek: typeof import("./leaderboardScoring.js").leaderboardRawScoresKeyForWeek;
let leaderboardTotalEarnedKeyForWeek: typeof import("./leaderboardScoring.js").leaderboardTotalEarnedKeyForWeek;
let rankScoreForRawScore: typeof import("./leaderboardScoring.js").rankScoreForRawScore;

async function cleanWeek(weekId: string) {
  await pgPool.query("DELETE FROM weekly_snapshots WHERE week_id = $1", [
    weekId,
  ]);
  await redis.del(...leaderboardKeysForWeek(weekId));
  await redis.del(`lock:weekly-finalize:${weekId}`);
}

async function seedLeaderboard(weekId: string, playerCount: number) {
  const pipeline = redis.pipeline();
  const now = Date.now();
  const leaderboardKey = leaderboardKeyForWeek(weekId);
  const rawScoresKey = leaderboardRawScoresKeyForWeek(weekId);
  const totalEarnedKey = leaderboardTotalEarnedKeyForWeek(weekId);
  let totalEarned = 0;

  await redis.del(...leaderboardKeysForWeek(weekId));

  for (let i = 1; i <= playerCount; i++) {
    const rawScore = 10_000 + ((i * 37) % 90_000);
    const earnedAt = now - ((i * 7919) % WEEK_MS);
    const score = rankScoreForRawScore(rawScore, earnedAt);

    totalEarned += rawScore;
    pipeline.hset(rawScoresKey, `test:user:${i}`, rawScore);
    pipeline.zadd(leaderboardKey, score, `test:user:${i}`);
  }

  pipeline.set(totalEarnedKey, totalEarned);
  await pipeline.exec();
}

async function readSnapshot(weekId: string) {
  const result = await pgPool.query(
    `
      SELECT
        status,
        total_weekly_earned::text,
        prize_pool_amount::text,
        distributed_amount::text,
        undistributed_amount::text,
        player_count,
        participant_count
      FROM weekly_snapshots
      WHERE week_id = $1
    `,
    [weekId],
  );

  return result.rows[0];
}

async function readPlayerSummary(weekId: string) {
  const result = await pgPool.query(
    `
      SELECT
        COUNT(*)::int AS count,
        MIN(rank)::int AS min_rank,
        MAX(rank)::int AS max_rank,
        SUM(reward_amount)::text AS reward_sum
      FROM weekly_snapshot_players
      WHERE week_id = $1
    `,
    [weekId],
  );

  return result.rows[0];
}

describeWeeklyIntegration("weeklyFinalizer integration", () => {
  beforeAll(async () => {
    if (!Number.isInteger(PLAYER_COUNT) || PLAYER_COUNT <= 0) {
      throw new Error("WEEKLY_TEST_PLAYERS must be a positive integer");
    }

    ({ redis } = await import("../config/redis.js"));
    ({ pgPool } = await import("../config/postgres.js"));
    ({ setupWeeklyTables } = await import("../scripts/setupWeeklyTables.js"));
    ({ finalizeWeeklyLeaderboard } = await import("./weeklyFinalizer.js"));
    ({
      applyEarnToLeaderboard,
      leaderboardKeysForWeek,
      leaderboardRawScoresKeyForWeek,
      leaderboardTotalEarnedKeyForWeek,
      rankScoreForRawScore,
    } = await import("./leaderboardScoring.js"));

    await setupWeeklyTables();
    await cleanWeek(WEEK_ID);
    await cleanWeek(LOCK_WEEK_ID);
    await cleanWeek(SCORE_WEEK_ID);
  });

  afterAll(async () => {
    await cleanWeek(WEEK_ID);
    await cleanWeek(LOCK_WEEK_ID);
    await cleanWeek(SCORE_WEEK_ID);
    await Promise.allSettled([redis.quit(), pgPool.end()]);
  });

  it(
    "finalizes 50k Redis scores, repairs stuck finalizing rows, and cleans stale finalized Redis data",
    async () => {
      await seedLeaderboard(WEEK_ID, PLAYER_COUNT);
      await pgPool.query(
        "INSERT INTO weekly_snapshots (week_id, status) VALUES ($1, $2)",
        [WEEK_ID, "finalizing"],
      );

      const result = await finalizeWeeklyLeaderboard(WEEK_ID);
      const snapshot = await readSnapshot(WEEK_ID);
      const playerSummary = await readPlayerSummary(WEEK_ID);
      const redisCountAfterFinalize = await redis.zcard(
        leaderboardKeyForWeek(WEEK_ID),
      );

      expect(result.status).toBe("finalized");
      expect(result.playerCount).toBe(100);
      expect(result.participantCount).toBe(PLAYER_COUNT);
      expect(snapshot.status).toBe("finalized");
      expect(snapshot.player_count).toBe(100);
      expect(snapshot.participant_count).toBe(PLAYER_COUNT);
      expect(playerSummary.count).toBe(100);
      expect(playerSummary.min_rank).toBe(1);
      expect(playerSummary.max_rank).toBe(100);
      expect(Number(playerSummary.reward_sum)).toBe(result.distributedAmount);
      expect(Number(snapshot.distributed_amount)).toBe(
        result.distributedAmount,
      );
      expect(redisCountAfterFinalize).toBe(0);

      const secondRun = await finalizeWeeklyLeaderboard(WEEK_ID);
      expect(secondRun.status).toBe("already-finalized");

      await seedLeaderboard(WEEK_ID, 5);
      expect(await redis.zcard(leaderboardKeyForWeek(WEEK_ID))).toBe(5);

      const thirdRun = await finalizeWeeklyLeaderboard(WEEK_ID);
      expect(thirdRun.status).toBe("already-finalized");
      expect(await redis.zcard(leaderboardKeyForWeek(WEEK_ID))).toBe(0);
    },
    60_000,
  );

  it("returns already-running while the Redis lock is held", async () => {
    const lockKey = `lock:weekly-finalize:${LOCK_WEEK_ID}`;

    await redis.set(lockKey, "manual-lock-test", "PX", 5 * 60 * 1000, "NX");

    try {
      const result = await finalizeWeeklyLeaderboard(LOCK_WEEK_ID);
      expect(result.status).toBe("already-running");
    } finally {
      await redis.del(lockKey);
    }
  });

  it("keeps raw score integer, ignores duplicate events, and orders score ties by reached time", async () => {
    const earlier = Date.parse("2026-06-22T10:00:00Z");
    const later = Date.parse("2026-06-22T10:05:00Z");

    await cleanWeek(SCORE_WEEK_ID);

    await applyEarnToLeaderboard({
      weekId: SCORE_WEEK_ID,
      eventId: "split-a-100",
      userId: "split:a",
      amount: 100,
      earnedAt: earlier,
    });

    for (let i = 0; i < 100; i++) {
      await applyEarnToLeaderboard({
        weekId: SCORE_WEEK_ID,
        eventId: `split-b-${i}`,
        userId: "split:b",
        amount: 1,
        earnedAt: later + i,
      });
    }

    const duplicateFirst = await applyEarnToLeaderboard({
      weekId: SCORE_WEEK_ID,
      eventId: "duplicate-event",
      userId: "split:c",
      amount: 10,
      earnedAt: earlier,
    });
    const duplicateSecond = await applyEarnToLeaderboard({
      weekId: SCORE_WEEK_ID,
      eventId: "duplicate-event",
      userId: "split:c",
      amount: 10,
      earnedAt: earlier,
    });

    const rawScores = await redis.hmget(
      leaderboardRawScoresKeyForWeek(SCORE_WEEK_ID),
      "split:a",
      "split:b",
      "split:c",
    );
    const topTwo = await redis.zrevrange(
      leaderboardKeyForWeek(SCORE_WEEK_ID),
      0,
      1,
    );
    const totalEarned = await redis.get(
      leaderboardTotalEarnedKeyForWeek(SCORE_WEEK_ID),
    );

    expect(duplicateFirst.applied).toBe(true);
    expect(duplicateSecond.applied).toBe(false);
    expect(rawScores).toEqual(["100", "100", "10"]);
    expect(topTwo).toEqual(["split:a", "split:b"]);
    expect(totalEarned).toBe("210");
  });
});
