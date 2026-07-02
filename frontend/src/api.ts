import type {
  EarnEventLog,
  LeaderboardView,
  WeeklySnapshotSummary,
} from "./types/leaderboard";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

function isLeaderboardView(value: unknown): value is LeaderboardView {
  if (!value || typeof value !== "object") {
    return false;
  }

  return Array.isArray((value as Partial<LeaderboardView>).topPlayers);
}

async function requestJson<T>(path: string, errorPrefix: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error(`${errorPrefix} failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function getLeaderboardView(
  userId: string,
): Promise<LeaderboardView> {
  const params = new URLSearchParams({ userId });
  const data = await requestJson<unknown>(
    `/leaderboard?${params.toString()}`,
    "Leaderboard request",
  );

  if (!isLeaderboardView(data)) {
    throw new Error("Unexpected leaderboard response");
  }

  return data;
}

export async function getRecentEarnEvents(): Promise<EarnEventLog[]> {
  const data = await requestJson<{ events: EarnEventLog[] }>(
    "/events/recent?limit=50",
    "Events request",
  );
  return data.events;
}

export async function getWeeklySnapshots(): Promise<WeeklySnapshotSummary[]> {
  const data = await requestJson<{ snapshots: WeeklySnapshotSummary[] }>(
    "/weekly/snapshots?limit=12",
    "Snapshots request",
  );
  return data.snapshots;
}
