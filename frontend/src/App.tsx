import { useEffect, useState } from "react";
import { getRecentEarnEvents, getWeeklySnapshots } from "./api";
import { Leaderboard } from "./components/Leaderboard";
import { useLeaderboard } from "./hooks/useLeaderboard";
import type { EarnEventLog, WeeklySnapshotSummary } from "./types/leaderboard";
import "./App.css";

const TRACKED_USER_ID = "user:19";
const EMPTY_EARN_EVENTS: EarnEventLog[] = [];
const EMPTY_SNAPSHOTS: WeeklySnapshotSummary[] = [];

type Route = "leaderboard" | "events" | "finalized";

interface PollingQueryState<T> {
  data: T;
  error: string | null;
  isLoading: boolean;
}

function routeFromHash(): Route {
  if (window.location.hash === "#/events") {
    return "events";
  }

  if (window.location.hash === "#/finalized") {
    return "finalized";
  }

  return "leaderboard";
}

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function usePollingQuery<T>(
  load: () => Promise<T>,
  refreshMs: number,
  initialData: T,
  fallbackError: string,
): PollingQueryState<T> {
  const [data, setData] = useState<T>(() => initialData);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const refresh = async () => {
      try {
        const nextData = await load();

        if (isActive) {
          setData(nextData);
          setError(null);
        }
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : fallbackError);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
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
  }, [fallbackError, load, refreshMs]);

  return { data, error, isLoading };
}

function AppNav({ route }: { route: Route }) {
  return (
    <nav className="app-nav" aria-label="Views">
      <a className={route === "leaderboard" ? "is-active" : ""} href="#/">
        Leaderboard
      </a>
      <a className={route === "events" ? "is-active" : ""} href="#/events">
        Events
      </a>
      <a
        className={route === "finalized" ? "is-active" : ""}
        href="#/finalized"
      >
        Finalized weeks
      </a>
    </nav>
  );
}

function LeaderboardPage() {
  const { state, retry } = useLeaderboard(TRACKED_USER_ID);

  return (
    <Leaderboard
      data={state.status === "success" ? state.data : null}
      currentUserId={TRACKED_USER_ID}
      isLoading={state.status === "loading"}
      error={state.status === "error" ? state.message : null}
      onRetry={retry}
    />
  );
}

function EventsPage() {
  const {
    data: events,
    error,
    isLoading,
  } = usePollingQuery(
    getRecentEarnEvents,
    5_000,
    EMPTY_EARN_EVENTS,
    "Failed to load events",
  );

  return (
    <section className="data-panel" aria-label="Recent earn events">
      <div className="data-panel__header">
        <h2>Recent events</h2>
        <span>{events.length}</span>
      </div>

      {isLoading && <p className="data-state">Loading events...</p>}
      {error && <p className="data-state">{error}</p>}
      {!isLoading && !error && events.length === 0 && (
        <p className="data-state">No events yet.</p>
      )}

      {!isLoading && !error && events.length > 0 && (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Amount</th>
                <th>Week</th>
                <th>Processed</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.eventId}>
                  <td>{event.userId}</td>
                  <td>{formatNumber(event.amount)}</td>
                  <td>{event.weekId}</td>
                  <td>{formatDate(event.processedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function FinalizedWeeksPage() {
  const {
    data: snapshots,
    error,
    isLoading,
  } = usePollingQuery(
    getWeeklySnapshots,
    15_000,
    EMPTY_SNAPSHOTS,
    "Failed to load snapshots",
  );

  return (
    <section className="data-panel" aria-label="Finalized weekly snapshots">
      <div className="data-panel__header">
        <h2>Finalized weeks</h2>
        <span>{snapshots.length}</span>
      </div>

      {isLoading && <p className="data-state">Loading weeks...</p>}
      {error && <p className="data-state">{error}</p>}
      {!isLoading && !error && snapshots.length === 0 && (
        <p className="data-state">No finalized weeks yet.</p>
      )}

      {!isLoading && !error && snapshots.length > 0 && (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Week</th>
                <th>Pool</th>
                <th>Distributed</th>
                <th>Participants</th>
                <th>Finalized</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((snapshot) => (
                <tr key={snapshot.weekId}>
                  <td>{snapshot.weekId}</td>
                  <td>{formatNumber(snapshot.prizePoolAmount)}</td>
                  <td>{formatNumber(snapshot.distributedAmount)}</td>
                  <td>{formatNumber(snapshot.participantCount)}</td>
                  <td>{formatDate(snapshot.finalizedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function App() {
  const [route, setRoute] = useState<Route>(() => routeFromHash());

  useEffect(() => {
    const syncRoute = () => {
      setRoute(routeFromHash());
    };

    window.addEventListener("hashchange", syncRoute);
    return () => {
      window.removeEventListener("hashchange", syncRoute);
    };
  }, []);

  return (
    <main className="app-shell">
      <div className="app-frame">
        <header className="app-header">
          <div>
            <p className="app-header__eyebrow">Live leaderboard</p>
            <h1>Panteon weekly ranking</h1>
          </div>
          <p className="app-header__user">{TRACKED_USER_ID}</p>
        </header>

        <AppNav route={route} />

        <div className="app-content">
          {route === "leaderboard" && <LeaderboardPage />}
          {route === "events" && <EventsPage />}
          {route === "finalized" && <FinalizedWeeksPage />}
        </div>
      </div>
    </main>
  );
}

export default App;
