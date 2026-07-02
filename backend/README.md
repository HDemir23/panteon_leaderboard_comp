# Leaderboard Backend

Node.js, TypeScript and Express backend for the weekly leaderboard case. The
system uses Redis, BullMQ, MongoDB and PostgreSQL.

## Backend Flow

```mermaid
flowchart TD
  subgraph WritePath["Write path"]
    Game["Game client"] --> EarnApi["POST /api/events/earn"]
    EarnApi --> Queue["BullMQ queue\nRedis-backed"]
    Queue --> Worker["Earn worker"]
    Worker --> Lua["Atomic Redis Lua script"]
    Lua --> LiveRank["Redis sorted set\nlive weekly ranking"]
    Lua --> RawScores["Redis hash\nraw weekly scores"]
    Lua --> Counters["Redis counters/sets\ntotal earned + processed events"]
    Worker --> Mongo["MongoDB\nearn event log"]
    LiveRank -. weekly cron .-> Finalizer["Weekly finalizer\nRedis lock"]
    RawScores -. weekly cron .-> Finalizer
    Counters -. weekly cron .-> Finalizer
    Finalizer --> Postgres["PostgreSQL\nsnapshot + rewards"]
    Finalizer --> Cleanup["Clear finalized\nRedis week keys"]
  end

  subgraph ReadPath["Read path"]
    UI["Leaderboard UI"] --> ReadApi["GET /api/leaderboard?userId=..."]
    ReadApi --> ReadRedis["Redis sorted set\nZREVRANGE + ZREVRANK"]
    ReadRedis --> View["Bounded JSON view\ntop 100 + user context"]
    View --> UI
  end
```

## Design Notes

- `POST /api/events/earn` validates the event and enqueues it instead of updating rankings inside the request.
- The simulation producer queues bounded random earn events across a 2M-user id range. It does not preload zero-score users.
- BullMQ keeps ingestion resilient while the worker processes earn events asynchronously.
- Redis is the live leaderboard store. Ranking reads use `ZREVRANGE` and `ZREVRANK`.
- Earn updates run through a Redis Lua script, so score updates, total counters and duplicate-event checks stay atomic.
- Raw scores are stored separately from rank scores because rank scores include the tie-break value.
- MongoDB stores the raw processed earn-event log for audit/debugging.
- PostgreSQL stores finalized weekly snapshots and calculated reward rows.
- The API returns a bounded view model: top 100 players, plus the current user's surrounding context when they are outside the top 100.

## Ranking Rules

- Higher weekly score ranks first.
- If scores are equal, the player who reached the score earlier ranks higher.
- Current user context fetches 3 players above and 2 players below the user.
- Weekly reward pool is 2% of total weekly earned currency.
- Rewards are calculated only for ranks 1-100 during weekly finalization.

## Runtime Pieces

- API server: Express routes and datastore connectivity checks.
- Worker: BullMQ consumer for earn events.
- Weekly scheduler: cron-driven finalizer with a Redis lock.
- Simulation: a separate producer process keeps random earn events flowing through the same queue, Redis and Mongo path as real player events.
- PostgreSQL setup script: creates weekly snapshot tables.

## Environment

```bash
PORT=3000
REDIS_URL=redis://localhost:6379
MONGO_URL=mongodb://localhost:27017
POSTGRES_URL=postgres://leaderboard:leaderboard@localhost:5432/leaderboard
WEEKLY_LEADERBOARD_TIMEZONE=Europe/Istanbul
WEEKLY_FINALIZE_CRON="5 0 * * 1"
EARN_SIMULATION_ENABLED=true
EARN_SIMULATION_INTERVAL_MS=5000
EARN_SIMULATION_EVENTS_PER_TICK=25
```

## Scripts

```bash
npm install
npm run build
npm test
npm run dev
npm run worker
npm run worker:dev
npm run simulate
npm run simulate:dev
npm run simulate:once
npm run simulate:once:dev
npm run weekly:setup
npm run weekly:finalize
```

Use `docker-compose up -d` to start Redis, PostgreSQL and MongoDB locally.
Run `npm run worker:dev` and `npm run simulate:dev` in separate local terminals when you want live simulated traffic.

Railway services should run the built production scripts after `npm run build`:

- API: `npm run start`
- Earn worker: `npm run worker`
- Simulation producer: `npm run simulate`
