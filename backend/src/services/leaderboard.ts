import { redis } from "../config/redis.js";
import { leaderboardKeyForWeek } from "./leaderboardWeek.js";
import {
  displayScoreFromRankScore,
  getRawScoresForUsers,
  leaderboardTotalEarnedKeyForWeek,
  parseScoredLeaderboardMembers,
} from "./leaderboardScoring.js";
import { calculatePrizePool, calculateWeeklyRewards } from "./rewardCalculator.js";

export interface PlayerRank {
  userId: string;
  score: number;
  rank: number; // 1-indexed, for display
  estimatedRewardAmount: number | null;
}

export interface LeaderboardView {
  weekId: string;
  totalWeeklyEarned: number;
  prizePoolAmount: number;
  topPlayers: PlayerRank[];
  currentUserContext: {
    self: PlayerRank;
    above: PlayerRank[];
    below: PlayerRank[];
  } | null;
}

const TOP_N = 100;
const ABOVE_COUNT = 3;
const BELOW_COUNT = 2;

function withEstimatedRewards(
  players: PlayerRank[],
  prizePoolAmount: number,
): PlayerRank[] {
  const rewards = calculateWeeklyRewards(players, prizePoolAmount);
  const rewardByUserId = new Map(
    rewards.players.map((player) => [player.userId, player.rewardAmount]),
  );

  return players.map((player) => ({
    ...player,
    estimatedRewardAmount: rewardByUserId.get(player.userId) ?? null,
  }));
}

async function buildPlayerRanks(
  weekId: string,
  raw: string[],
  rankOffset: number,
): Promise<PlayerRank[]> {
  const members = parseScoredLeaderboardMembers(raw, rankOffset);
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
      estimatedRewardAmount: null,
    };
  });
}

export async function getLeaderboardView(
  weekId: string,
  userId: string,
): Promise<LeaderboardView> {
  const leaderboardKey = leaderboardKeyForWeek(weekId);
  const [topRaw, userRank, totalWeeklyEarnedRaw] = await Promise.all([
    redis.zrevrange(leaderboardKey, 0, TOP_N - 1, "WITHSCORES"),
    redis.zrevrank(leaderboardKey, userId),
    redis.get(leaderboardTotalEarnedKeyForWeek(weekId)),
  ]);

  const totalWeeklyEarned =
    totalWeeklyEarnedRaw === null ? 0 : Number(totalWeeklyEarnedRaw);
  const prizePoolAmount = calculatePrizePool(totalWeeklyEarned);
  const topPlayers = withEstimatedRewards(
    await buildPlayerRanks(weekId, topRaw, 0),
    prizePoolAmount,
  );
  const topRewardByUserId = new Map(
    topPlayers.map((player) => [player.userId, player.estimatedRewardAmount]),
  );
  const baseView = {
    weekId,
    totalWeeklyEarned,
    prizePoolAmount,
    topPlayers,
  };

  // User has no score this week
  if (userRank === null) {
    return { ...baseView, currentUserContext: null };
  }

  // User is already inside the top 100 — no extra context needed
  if (userRank < TOP_N) {
    return { ...baseView, currentUserContext: null };
  }

  // User is outside the top 100 — fetch the surrounding window
  const start = Math.max(0, userRank - ABOVE_COUNT);
  const end = userRank + BELOW_COUNT;

  const contextRaw = await redis.zrevrange(
    leaderboardKey,
    start,
    end,
    "WITHSCORES",
  );
  const contextPlayers = (await buildPlayerRanks(weekId, contextRaw, start)).map(
    (player) => ({
      ...player,
      estimatedRewardAmount: topRewardByUserId.get(player.userId) ?? null,
    }),
  );

  const selfIndex = contextPlayers.findIndex((p) => p.userId === userId);

  if (selfIndex === -1) {
    return { ...baseView, currentUserContext: null };
  }

  const self = contextPlayers[selfIndex];
  const above = contextPlayers.slice(0, selfIndex);
  const below = contextPlayers.slice(selfIndex + 1);

  return {
    ...baseView,
    currentUserContext: { self, above, below },
  };
}
