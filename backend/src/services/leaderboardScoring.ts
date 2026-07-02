import { redis } from "../config/redis.js";
import { leaderboardKeyForWeek } from "./leaderboardWeek.js";

const RANK_SCORE_SCALE = 1_000_000_000_000;
const TIE_BREAK_EPOCH_CEILING_MS = 10_000_000_000_000;
const TIE_BREAK_PRECISION_MS = 100;

export interface LeaderboardEarnEvent {
  weekId: string;
  eventId: string;
  userId: string;
  amount: number;
  earnedAt: number;
}

export interface LeaderboardEarnResult {
  applied: boolean;
  rawScore: number;
}

export interface ScoredLeaderboardMember {
  userId: string;
  rankScore: number;
  rank: number;
}

const APPLY_EARN_SCRIPT = `
  local leaderboardKey = KEYS[1]
  local rawScoresKey = KEYS[2]
  local totalEarnedKey = KEYS[3]
  local processedEventsKey = KEYS[4]

  local eventId = ARGV[1]
  local userId = ARGV[2]
  local amount = tonumber(ARGV[3])
  local earnedAt = tonumber(ARGV[4])
  local rankScoreScale = tonumber(ARGV[5])
  local tieBreakEpochCeilingMs = tonumber(ARGV[6])
  local tieBreakPrecisionMs = tonumber(ARGV[7])

  if redis.call("SISMEMBER", processedEventsKey, eventId) == 1 then
    return { "0", redis.call("HGET", rawScoresKey, userId) or "0" }
  end

  local rawScore = redis.call("HINCRBY", rawScoresKey, userId, amount)
  local tieBreak = math.floor((tieBreakEpochCeilingMs - earnedAt) / tieBreakPrecisionMs)

  if tieBreak < 0 then
    tieBreak = 0
  end

  local rankScore = (rawScore * rankScoreScale) + tieBreak

  redis.call("ZADD", leaderboardKey, rankScore, userId)
  redis.call("INCRBY", totalEarnedKey, amount)
  redis.call("SADD", processedEventsKey, eventId)

  return { "1", tostring(rawScore) }
`;

export function leaderboardRawScoresKeyForWeek(weekId: string): string {
  return `${leaderboardKeyForWeek(weekId)}:scores`;
}

export function leaderboardTotalEarnedKeyForWeek(weekId: string): string {
  return `${leaderboardKeyForWeek(weekId)}:total-earned`;
}

export function leaderboardProcessedEventsKeyForWeek(weekId: string): string {
  return `${leaderboardKeyForWeek(weekId)}:processed-events`;
}

export function leaderboardKeysForWeek(weekId: string): string[] {
  return [
    leaderboardKeyForWeek(weekId),
    leaderboardRawScoresKeyForWeek(weekId),
    leaderboardTotalEarnedKeyForWeek(weekId),
    leaderboardProcessedEventsKeyForWeek(weekId),
  ];
}

export function rankScoreForRawScore(
  rawScore: number,
  earnedAt: number,
): number {
  const tieBreak = Math.max(
    0,
    Math.floor(
      (TIE_BREAK_EPOCH_CEILING_MS - earnedAt) / TIE_BREAK_PRECISION_MS,
    ),
  );

  return rawScore * RANK_SCORE_SCALE + tieBreak;
}

export function displayScoreFromRankScore(rankScore: number): number {
  if (rankScore >= RANK_SCORE_SCALE) {
    return Math.floor(rankScore / RANK_SCORE_SCALE);
  }

  return Math.floor(rankScore);
}

export function parseScoredLeaderboardMembers(
  raw: string[],
  rankOffset = 0,
): ScoredLeaderboardMember[] {
  const members: ScoredLeaderboardMember[] = [];

  for (let i = 0; i < raw.length; i += 2) {
    members.push({
      userId: raw[i],
      rankScore: Number(raw[i + 1]),
      rank: rankOffset + members.length + 1,
    });
  }

  return members;
}

export async function applyEarnToLeaderboard(
  event: LeaderboardEarnEvent,
): Promise<LeaderboardEarnResult> {
  const result = await redis.eval(
    APPLY_EARN_SCRIPT,
    4,
    leaderboardKeyForWeek(event.weekId),
    leaderboardRawScoresKeyForWeek(event.weekId),
    leaderboardTotalEarnedKeyForWeek(event.weekId),
    leaderboardProcessedEventsKeyForWeek(event.weekId),
    event.eventId,
    event.userId,
    String(event.amount),
    String(event.earnedAt),
    String(RANK_SCORE_SCALE),
    String(TIE_BREAK_EPOCH_CEILING_MS),
    String(TIE_BREAK_PRECISION_MS),
  );

  if (!Array.isArray(result)) {
    throw new Error("Unexpected Redis earn script result");
  }

  const [applied, rawScore] = result.map(String);

  return {
    applied: applied === "1",
    rawScore: Number(rawScore),
  };
}

export async function getRawScoresForUsers(
  weekId: string,
  userIds: string[],
): Promise<Array<number | null>> {
  if (userIds.length === 0) {
    return [];
  }

  const scores = await redis.hmget(
    leaderboardRawScoresKeyForWeek(weekId),
    ...userIds,
  );

  return scores.map((score) => (score === null ? null : Number(score)));
}

export async function deleteLeaderboardWeekData(weekId: string): Promise<void> {
  await redis.del(...leaderboardKeysForWeek(weekId));
}
