# Leaderboard Backend

Node.js/TypeScript backend for the weekly leaderboard case. The stack uses
Express, Redis, MongoDB, PostgreSQL, and BullMQ.

## Core Flow

- `POST /api/events/earn` accepts a demo earn event and enqueues it.
- The worker assigns the event to the week of `earnedAt`, not the processing time.
- Redis stores raw weekly scores in a hash and rank-only scores in a sorted set.
- Equal raw scores are ordered by the earlier timestamp that reached the score.
- Weekly finalization snapshots the top 100 rewarded players into PostgreSQL and
  clears the Redis week keys.

## Known Scope Boundaries

- `POST /api/events/earn` is intentionally open for the case/demo. A production
  version should put this endpoint behind trusted game-server ingestion, API key
  auth, or JWT-based authentication.
- The finalizer is acceptable for the demo scale. At very large production scale,
  total earned and participants should continue to come from counters, and any
  deeper historical/global comparison should avoid scanning massive leaderboards.
- Wallet crediting after reward calculation is not implemented in this backend.

## Useful Commands

- `npm test`
- `npm run test:weekly`
- `npm run dev`
- `npm run worker`
- `npm run weekly:setup`
- `npm run weekly:finalize`
