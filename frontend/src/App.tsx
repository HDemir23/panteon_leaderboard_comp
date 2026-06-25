import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "./api";
import { DemoControls } from "./components/DemoControls";
import { Leaderboard } from "./components/Leaderboard";
import { SnapshotPanel } from "./components/SnapshotPanel";
import { useLeaderboard } from "./hooks/useLeaderboard";
import type { WeeklySnapshot } from "./types/leaderboard";
import "./App.css";

function positiveInteger(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, Math.floor(value));
}

async function fetchSnapshot(weekId?: string): Promise<WeeklySnapshot | null> {
  const path = weekId
    ? `/weekly/snapshots/${encodeURIComponent(weekId)}`
    : "/weekly/snapshots/latest";
  const response = await fetch(`${API_BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error(`Snapshot request failed with ${response.status}`);
  }

  const data: { snapshot: WeeklySnapshot | null } = await response.json();
  return data.snapshot;
}

function App() {
  const [userNumber, setUserNumber] = useState(19);
  const [pointsToAdd, setPointsToAdd] = useState(1_000);
  const [isAddingPoints, setIsAddingPoints] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [snapshot, setSnapshot] = useState<WeeklySnapshot | null>(null);
  const [isSnapshotLoading, setIsSnapshotLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const currentUserId = useMemo(() => `user:${userNumber}`, [userNumber]);
  const { state, retry } = useLeaderboard(currentUserId);

  const loadSnapshot = useCallback(async () => {
    setIsSnapshotLoading(true);

    try {
      setSnapshot(await fetchSnapshot());
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Failed to load weekly snapshot",
      );
    } finally {
      setIsSnapshotLoading(false);
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    void fetchSnapshot()
      .then((nextSnapshot) => {
        if (isActive) {
          setSnapshot(nextSnapshot);
        }
      })
      .catch((err) => {
        if (isActive) {
          setMessage(
            err instanceof Error ? err.message : "Failed to load weekly snapshot",
          );
        }
      })
      .finally(() => {
        if (isActive) {
          setIsSnapshotLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const addPoints = useCallback(async () => {
    setIsAddingPoints(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/events/earn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          amount: pointsToAdd,
        }),
      });

      if (!response.ok) {
        throw new Error(`Add points failed with ${response.status}`);
      }

      setMessage(
        `Queued ${pointsToAdd.toLocaleString()} points for ${currentUserId}`,
      );
      window.setTimeout(() => {
        void retry();
      }, 700);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to add points");
    } finally {
      setIsAddingPoints(false);
    }
  }, [currentUserId, pointsToAdd, retry]);

  const finalizeWeek = useCallback(async () => {
    setIsFinalizing(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/weekly/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(`Finalize failed with ${response.status}`);
      }

      const result: { status: string; weekId: string } = await response.json();
      setMessage(`Finalize result: ${result.status} ${result.weekId}`);
      const finalizedSnapshot = await fetchSnapshot(result.weekId);
      setSnapshot(finalizedSnapshot);
      await retry();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to finalize week");
    } finally {
      setIsFinalizing(false);
    }
  }, [retry]);

  const seedDemoData = useCallback(async () => {
    setIsSeeding(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/demo/seed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(`Seed failed with ${response.status}`);
      }

      const result: { weekId: string; playerCount: number } =
        await response.json();
      setMessage(
        `Seeded ${result.playerCount.toLocaleString()} players for ${result.weekId}`,
      );
      await retry();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to seed data");
    } finally {
      setIsSeeding(false);
    }
  }, [retry]);

  return (
    <main className="app-shell">
      <div className="app-layout">
        <aside className="app-sidebar" aria-label="Demo tools">
          <DemoControls
            userNumber={userNumber}
            pointsToAdd={pointsToAdd}
            isAddingPoints={isAddingPoints}
            isFinalizing={isFinalizing}
            isSeeding={isSeeding}
            message={message}
            onUserNumberChange={(value) =>
              setUserNumber((current) => positiveInteger(value, current))
            }
            onPointsToAddChange={(value) =>
              setPointsToAdd((current) => positiveInteger(value, current))
            }
            onAddPoints={addPoints}
            onFinalizeWeek={finalizeWeek}
            onSeedDemoData={seedDemoData}
            onRefresh={() => {
              void retry();
              void loadSnapshot();
            }}
          />
          <SnapshotPanel snapshot={snapshot} isLoading={isSnapshotLoading} />
        </aside>

        <Leaderboard
          data={state.status === "success" ? state.data : null}
          currentUserId={currentUserId}
          isLoading={state.status === "loading"}
          error={state.status === "error" ? state.message : null}
          onRetry={retry}
        />
      </div>
    </main>
  );
}

export default App;
