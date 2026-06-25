import { Leaderboard } from "./components/Leaderboard";
import { useLeaderboard } from "./hooks/useLeaderboard";
import "./App.css";

const DEMO_USER_ID = "user:9";

function App() {
  const { state, retry } = useLeaderboard(DEMO_USER_ID);

  return (
    <main className="app-shell">
      <Leaderboard
        data={state.status === "success" ? state.data : null}
        currentUserId={DEMO_USER_ID}
        isLoading={state.status === "loading"}
        error={state.status === "error" ? state.message : null}
        onRetry={retry}
        weekEndsAt="in 2d 14h"
        rewardPoolTotal={1_000_000}
      />
    </main>
  );
}

export default App;
