import type { WeeklySnapshot } from "./types/leaderboard";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

export interface FinalizeWeekResult {
  status: string;
  weekId: string;
}

export interface SeedDemoDataResult {
  weekId: string;
  playerCount: number;
}

function postOptions(body: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

async function requestJson<T>(
  path: string,
  init: RequestInit | undefined,
  errorPrefix: string,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);

  if (!response.ok) {
    throw new Error(`${errorPrefix} failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function addLeaderboardPoints(
  userId: string,
  amount: number,
): Promise<void> {
  await requestJson<unknown>(
    "/events/earn",
    postOptions({ userId, amount }),
    "Add points",
  );
}

export async function finalizeCurrentWeek(): Promise<FinalizeWeekResult> {
  return requestJson<FinalizeWeekResult>(
    "/weekly/finalize",
    postOptions({}),
    "Finalize",
  );
}

export async function seedDemoLeaderboard(): Promise<SeedDemoDataResult> {
  return requestJson<SeedDemoDataResult>(
    "/demo/seed",
    postOptions({}),
    "Seed",
  );
}

export async function getWeeklySnapshot(
  weekId?: string,
): Promise<WeeklySnapshot | null> {
  const path = weekId
    ? `/weekly/snapshots/${encodeURIComponent(weekId)}`
    : "/weekly/snapshots/latest";

  const data = await requestJson<{ snapshot: WeeklySnapshot | null }>(
    path,
    undefined,
    "Snapshot request",
  );
  return data.snapshot;
}
