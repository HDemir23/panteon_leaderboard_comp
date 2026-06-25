export interface PlayerRank {
  userId: string;
  score: number;
  rank: number;
}

export interface CurrentUserContext {
  self: PlayerRank;
  above: PlayerRank[];
  below: PlayerRank[];
}

export interface LeaderboardView {
  topPlayers: PlayerRank[];
  currentUserContext: CurrentUserContext | null;
}

export type LeaderboardRequestState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "success"; data: LeaderboardView };
