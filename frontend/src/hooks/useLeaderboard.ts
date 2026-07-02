import { useCallback, useEffect, useState } from "react";
import { getLeaderboardView } from "../api";
import type { LeaderboardRequestState } from "../types/leaderboard";

async function loadLeaderboard(userId: string): Promise<LeaderboardRequestState> {
  if (userId.trim().length === 0) {
    return { status: "error", message: "Missing user id" };
  }

  try {
    const data = await getLeaderboardView(userId);

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

export function useLeaderboard(userId: string, refreshMs = 5_000) {
  const [state, setState] = useState<LeaderboardRequestState>({
    status: "loading",
  });

  const fetchLeaderboard = useCallback(async () => {
    setState({ status: "loading" });
    setState(await loadLeaderboard(userId));
  }, [userId]);

  useEffect(() => {
    let isActive = true;

    const refresh = async () => {
      const nextState = await loadLeaderboard(userId);

      if (isActive) {
        setState(nextState);
      }
    };

    void refresh();
    const interval =
      refreshMs > 0 ? window.setInterval(refresh, refreshMs) : null;

    return () => {
      isActive = false;

      if (interval !== null) {
        window.clearInterval(interval);
      }
    };
  }, [refreshMs, userId]);

  return { state, retry: fetchLeaderboard };
}
