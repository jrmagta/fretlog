# Playwright E2E Test Suite — Design

**Date:** 2026-04-25
**Status:** Approved (pending implementation plan)
**Tracking issue:** [#2](https://github.com/jrmagta/fretlog/issues/2)

## Goal

Add end-to-end browser tests using Playwright to cover the core user flows across the full stack. Serves as a learning exercise for web app testing with Claude.

## Scope (first pass)

5 smoke tests, one happy path per major flow. Comprehensive coverage and CI integration are out of scope for this iteration.

## Architecture

A parallel E2E stack runs alongside the dev stack on different ports.

```
docker-compose.e2e.yml
├── db_e2e        Postgres on tmpfs, port 5434
├── backend_e2e   Express on port 3001, NODE_ENV=test, reset route enabled
└── frontend_e2e  Vite on port 5174, proxies /api → backend_e2e:3000
```

The Playwright runner hits `http://localhost:5174` and calls `POST http://localhost:3001/api/test/reset` before each test to truncate all tables.

When the e2e stack is not running, dev is unaffected. The two stacks are fully independent and can run concurrently.

## Test layout

Top-level `e2e/` package with its own `package.json`, so Playwright dependencies do not bloat the frontend install.

```
e2e/
├── package.json              @playwright/test only
├── playwright.config.ts      Chromium only, baseURL http://localhost:5174
├── run.sh                    One-shot: compose up → wait → test → compose down
├── helpers/
│   └── reset-db.ts           POST /api/test/reset, used in beforeEach
└── tests/
    ├── dashboard-timer.spec.ts
    ├── log-session.spec.ts
    ├── history-view.spec.ts
    ├── edit-session.spec.ts
    └── library.spec.ts
```

## The 5 smoke tests

Each test starts with a DB truncate, then exercises one happy path.

1. **dashboard-timer** — start timer, wait ~2s, end session, fill the overlay's required fields, save, assert the session appears in "Recent sessions".
2. **log-session** — use the Dashboard manual quick-log form with date, duration, song, technique, notes, save, assert it appears in Recent.
3. **history-view** — seed 3 sessions via direct API calls, navigate to `/sessions`, assert all 3 visible, expand one row, assert detail loads.
4. **edit-session** — seed 1 session via API, click Edit, change duration and notes, save, assert update reflected in History.
5. **library** — navigate to `/songs`, add a song, edit it inline, delete it, assert each step.

Tests 3 and 4 seed via direct API calls (`POST /api/sessions`) instead of clicking through the UI — keeps each test focused on what it's actually testing.

## Reset mechanism

A test-only backend route, mounted only when `NODE_ENV=test`:

```ts
// backend/src/routes/test.ts
if (process.env.NODE_ENV === 'test') {
  router.post('/api/test/reset', async (_req, res) => {
    await db.query(`
      TRUNCATE sessions, songs, techniques,
               session_songs, session_techniques
      RESTART IDENTITY CASCADE
    `);
    res.status(204).end();
  });
}
```

Mounted in `app.ts` behind the same env check. The dev and prod servers (where `NODE_ENV` is `development` or `production`) never expose this route — defense in depth against accidental exposure.

E2E helper:

```ts
// e2e/helpers/reset-db.ts
export async function resetDb() {
  await fetch('http://localhost:3001/api/test/reset', { method: 'POST' });
}
```

Used in `test.beforeEach(resetDb)` in each spec.

## Running the suite

**During dev (fast iteration):**

```bash
podman-compose -f docker-compose.e2e.yml up -d   # once
cd e2e && npx playwright test                    # repeat as needed
npx playwright test --ui                         # for debugging
```

**One-shot (clean run, CI-ready):**

```bash
./e2e/run.sh
```

`run.sh`: `compose up -d` → wait for `backend_e2e` health (poll `GET /api/health`) → run tests → capture exit code → `compose down` → exit with the captured code.

**Top-level npm script:** `npm run test:e2e` at the repo root, equivalent to `./e2e/run.sh`.

## Design decisions

- **Dedicated test DB on a new port (5434), not the dev DB or `db_test`** — keeps real practice data safe; matches the existing `db_test` pattern for backend tests; isolated from backend Vitest tests so they don't conflict.
- **Truncate before each test, not once per suite** — at 5 tests the cost is trivial (~50ms per test) and avoids the "passes alone, fails together" class of bugs.
- **Reset endpoint over direct DB access from Playwright** — Playwright doesn't need a Postgres client dependency or DB credentials; the backend already has them.
- **Chromium only** — single-user self-hosted app; no need for cross-browser parity yet.
- **Manual stack startup during dev, scripted for one-shot runs** — avoids paying compose startup time on every iteration; `run.sh` handles the clean-run case.
- **Top-level `e2e/` package, not `frontend/e2e/`** — E2E tests span the full stack, not just the frontend; keeps Playwright deps separate.

## Out of scope

- CI integration (follow-up)
- Visual regression testing
- Cross-browser testing
- Comprehensive coverage beyond the 5 smoke tests
