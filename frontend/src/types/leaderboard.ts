export interface PlayerRank {
  userId: string;
  score: number;
  rank: number;
  estimatedRewardAmount: number | null;
}

export interface CurrentUserContext {
  self: PlayerRank;
  above: PlayerRank[];
  below: PlayerRank[];
}

export interface LeaderboardView {
  weekId: string;
  totalWeeklyEarned: number;
  prizePoolAmount: number;
  topPlayers: PlayerRank[];
  currentUserContext: CurrentUserContext | null;
}

export interface WeeklySnapshotSummary {
  weekId: string;
  totalWeeklyEarned: number;
  prizePoolAmount: number;
  distributedAmount: number;
  playerCount: number;
  participantCount: number;
  finalizedAt: string | null;
}

export interface EarnEventLog {
  eventId: string;
  userId: string;
  amount: number;
  earnedAt: string;
  weekId: string;
  processedAt: string;
}

export type LeaderboardRequestState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "success"; data: LeaderboardView };
