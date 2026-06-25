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

export interface WeeklySnapshotPlayer {
  rank: number;
  userId: string;
  score: number;
  rewardAmount: number;
}

export interface WeeklySnapshot {
  weekId: string;
  status: string;
  totalWeeklyEarned: number;
  prizePoolAmount: number;
  distributedAmount: number;
  undistributedAmount: number;
  playerCount: number;
  participantCount: number;
  finalizedAt: string | null;
  players: WeeklySnapshotPlayer[];
}

export type LeaderboardRequestState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "success"; data: LeaderboardView };
