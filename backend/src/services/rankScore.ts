export const LEGACY_RANK_SCORE_SCALE = 1_000_000_000_000;
export const TIE_BREAK_EPOCH_CEILING_MS = 10_000_000_000_000;
export const TIE_BREAK_PRECISION_MS = 100;
export const TIE_BREAK_SCORE_SCALE = 1_000_000_000_000;

export interface ScoredLeaderboardMember {
  userId: string;
  rankScore: number;
  rank: number;
}

function tieBreakForEarnedAt(earnedAt: number): number {
  return Math.max(
    0,
    Math.floor(
      (TIE_BREAK_EPOCH_CEILING_MS - earnedAt) / TIE_BREAK_PRECISION_MS,
    ),
  );
}

export function rankScoreForRawScore(
  rawScore: number,
  earnedAt: number,
): number {
  return rawScore + tieBreakForEarnedAt(earnedAt) / TIE_BREAK_SCORE_SCALE;
}

export function displayScoreFromRankScore(rankScore: number): number {
  if (rankScore >= LEGACY_RANK_SCORE_SCALE) {
    return Math.floor(rankScore / LEGACY_RANK_SCORE_SCALE);
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
