import { randomUUID } from "crypto";
import { redis } from "../config/redis.js";
import { pgPool } from "../config/postgres.js";
import { leaderboardKeyForWeek } from "./leaderboardWeek.js";
import {
  deleteLeaderboardWeekData,
  displayScoreFromRankScore,
  getRawScoresForUsers,
  leaderboardTotalEarnedKeyForWeek,
  parseScoredLeaderboardMembers,
} from "./leaderboardScoring.js";
import {
  calculatePrizePool,
  calculateWeeklyRewards,
  type RewardCandidate,
} from "./rewardCalculator.js";

export interface WeeklyFinalizeResult {
  status: "finalized" | "already-finalized" | "already-running";
  weekId: string;
  leaderboardKey: string;
  totalWeeklyEarned?: number;
  prizePoolAmount?: number;
  distributedAmount?: number;
  undistributedAmount?: number;
  playerCount?: number;
  participantCount?: number;
}

const LOCK_TTL_MS = 5 * 60 * 1000;
const TOP_PLAYER_LIMIT = 100;

async function sumLegacyDisplayScores(leaderboardKey: string): Promise<number> {
  const raw = await redis.zrange(leaderboardKey, 0, -1, "WITHSCORES");
  let total = 0;

  for (let i = 1; i < raw.length; i += 2) {
    total += displayScoreFromRankScore(Number(raw[i]));
  }

  return total;
}

async function parseSnapshotPlayers(
  weekId: string,
  raw: string[],
): Promise<RewardCandidate[]> {
  const members = parseScoredLeaderboardMembers(raw);
  const userIds = members.map((member) => member.userId);
  const rawScores = await getRawScoresForUsers(weekId, userIds);

  return members.map((member, index) => {
    const rawScore = rawScores[index];

    return {
      userId: member.userId,
      score:
        rawScore === null
          ? displayScoreFromRankScore(member.rankScore)
          : rawScore,
      rank: member.rank,
    };
  });
}

async function releaseLock(lockKey: string, token: string) {
  await redis.eval(
    `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      end
      return 0
    `,
    1,
    lockKey,
    token,
  );
}

export async function finalizeWeeklyLeaderboard(
  weekId: string,
): Promise<WeeklyFinalizeResult> {
  const leaderboardKey = leaderboardKeyForWeek(weekId);
  const lockKey = `lock:weekly-finalize:${weekId}`;
  const lockToken = randomUUID();

  const lockAcquired = await redis.set(
    lockKey,
    lockToken,
    "PX",
    LOCK_TTL_MS,
    "NX",
  );

  if (lockAcquired !== "OK") {
    return { status: "already-running", weekId, leaderboardKey };
  }

  try {
    const existing = await pgPool.query(
      "SELECT status FROM weekly_snapshots WHERE week_id = $1",
      [weekId],
    );

    if (existing.rows[0]?.status === "finalized") {
      await deleteLeaderboardWeekData(weekId);
      return { status: "already-finalized", weekId, leaderboardKey };
    }

    if (existing.rows[0]?.status === "finalizing") {
      // Leftover finalizing snapshots are retryable while this Redis lock is held.
      await pgPool.query(
        "DELETE FROM weekly_snapshots WHERE week_id = $1 AND status = 'finalizing'",
        [weekId],
      );
    }

    const [topRaw, totalWeeklyEarnedRaw, participantCount] = await Promise.all([
      redis.zrevrange(leaderboardKey, 0, TOP_PLAYER_LIMIT - 1, "WITHSCORES"),
      redis.get(leaderboardTotalEarnedKeyForWeek(weekId)),
      redis.zcard(leaderboardKey),
    ]);

    const topPlayers = await parseSnapshotPlayers(weekId, topRaw);
    const totalWeeklyEarned =
      totalWeeklyEarnedRaw === null
        ? await sumLegacyDisplayScores(leaderboardKey)
        : Number(totalWeeklyEarnedRaw);
    const prizePoolAmount = calculatePrizePool(totalWeeklyEarned);
    const {
      players,
      distributedAmount,
      undistributedAmount,
    } = calculateWeeklyRewards(topPlayers, prizePoolAmount);

    const client = await pgPool.connect();

    try {
      await client.query("BEGIN");
      await client.query(
        `
          INSERT INTO weekly_snapshots (
            week_id,
            status,
            total_weekly_earned,
            prize_pool_amount,
            distributed_amount,
            undistributed_amount,
            player_count,
            participant_count
          )
          VALUES ($1, 'finalizing', $2, $3, $4, $5, $6, $7)
        `,
        [
          weekId,
          totalWeeklyEarned,
          prizePoolAmount,
          distributedAmount,
          undistributedAmount,
          players.length,
          participantCount,
        ],
      );

      for (const player of players) {
        await client.query(
          `
            INSERT INTO weekly_snapshot_players (
              week_id,
              rank,
              user_id,
              score,
              reward_amount
            )
            VALUES ($1, $2, $3, $4, $5)
          `,
          [
            weekId,
            player.rank,
            player.userId,
            player.score,
            player.rewardAmount,
          ],
        );
      }

      await client.query(
        `
          UPDATE weekly_snapshots
          SET status = 'finalized',
              finalized_at = NOW(),
              updated_at = NOW()
          WHERE week_id = $1
        `,
        [weekId],
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    await deleteLeaderboardWeekData(weekId);

    return {
      status: "finalized",
      weekId,
      leaderboardKey,
      totalWeeklyEarned,
      prizePoolAmount,
      distributedAmount,
      undistributedAmount,
      playerCount: players.length,
      participantCount,
    };
  } finally {
    await releaseLock(lockKey, lockToken);
  }
}
