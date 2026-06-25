import { useCallback, useEffect, useState } from "react";
import type { LeaderboardRequestState, LeaderboardView } from "../types/leaderboard";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

function isLeaderboardView(value: unknown): value is LeaderboardView {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<LeaderboardView>;
  return Array.isArray(candidate.topPlayers);
}

async function loadLeaderboard(userId: string): Promise<LeaderboardRequestState> {
  if (!userId) {
    return { status: "error", message: "Missing user id" };
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/leaderboard?userId=${encodeURIComponent(userId)}`,
    );

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data: unknown = await response.json();

    if (!isLeaderboardView(data)) {
      throw new Error("Unexpected leaderboard response");
    }

    if (data.topPlayers.length === 0) {
      return { status: "empty" };
    }

    return { status: "success", data };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Failed to load leaderboard",
    };
  }
}

export function useLeaderboard(userId: string) {
  const [state, setState] = useState<LeaderboardRequestState>({
    status: "loading",
  });

  const fetchLeaderboard = useCallback(async () => {
    setState({ status: "loading" });
    setState(await loadLeaderboard(userId));
  }, [userId]);

  useEffect(() => {
    let isActive = true;

    void loadLeaderboard(userId).then((nextState) => {
      if (isActive) {
        setState(nextState);
      }
    });

    return () => {
      isActive = false;
    };
  }, [userId]);

  return { state, retry: fetchLeaderboard };
}
