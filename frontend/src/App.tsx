import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addLeaderboardPoints,
  finalizeCurrentWeek,
  getWeeklySnapshot,
  seedDemoLeaderboard,
} from "./api";
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
      setSnapshot(await getWeeklySnapshot());
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

    void getWeeklySnapshot()
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
      await addLeaderboardPoints(currentUserId, pointsToAdd);
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
      const result = await finalizeCurrentWeek();
      setMessage(`Finalize result: ${result.status} ${result.weekId}`);
      const finalizedSnapshot = await getWeeklySnapshot(result.weekId);
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
      const result = await seedDemoLeaderboard();
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
