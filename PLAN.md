# Fretlog Dev Plan

## Stack
- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL
- Infra: podman-compose
- Docs: MkDocs Material → GitHub Pages

## Implementation Steps

### Phase 1 — Backend

- [x] **Step 1** — `docker-compose.yml` + Postgres
  - Single `podman-compose up` starts everything
  - Named volume `pgdata` for persistence
  - Healthcheck on `db` so backend waits for ready state

- [x] **Step 2** — Backend skeleton
  - Express + TypeScript via `ts-node-dev`
  - `GET /api/health` verifies DB connectivity
  - `app.ts` exports the Express app separately from server startup (enables testing)

- [x] **Step 3** — DB migrations
  - `backend/src/migrations/001_initial.sql` runs at server startup via `migrate.ts`
  - All 5 tables: `sessions`, `songs`, `techniques`, `session_songs`, `session_techniques`
  - `songs` and `techniques` use soft-delete (`deleted_at`) to preserve session history
  - Migration is idempotent (`IF NOT EXISTS`)

- [x] **Step 4** — Sessions CRUD + tests
  - `GET /api/sessions` — paginated (limit/offset), ordered by date DESC
  - `POST /api/sessions` — create
  - `GET /api/sessions/:id` — single session
  - `PUT /api/sessions/:id` — update
  - `DELETE /api/sessions/:id` — hard delete (cascades to join tables)
  - Tests: Vitest + Supertest against a real `db_test` Postgres on port 5433

- [x] **Step 5** — Songs + Techniques CRUD + tests
  - Full CRUD for both resources
  - List/get filters out soft-deleted records
  - Delete sets `deleted_at` rather than removing the row
  - Tests cover soft-delete visibility behaviour

- [x] **Step 6** — Session ↔ Song/Technique join endpoints
  - Attach/detach songs and techniques to sessions
  - `GET /api/sessions/:id` returns full detail including linked songs and techniques
  - Duplicate attaches are idempotent (`ON CONFLICT DO NOTHING`)
  - 49/49 tests passing

- [ ] **Step 7** — Stats endpoint
  - `GET /api/sessions/stats`
  - Returns: current streak (consecutive days), weekly total (minutes), monthly total (minutes)
  - Streak and aggregation logic in SQL/Postgres

### Phase 2 — Frontend

- [ ] **Step 8** — Frontend scaffold
  - Vite + React + TypeScript
  - Vite proxy: `/api` → `http://backend:3000` (no CORS config needed)
  - Typed fetch wrappers in `src/api/`

- [ ] **Step 9** — Dashboard page
  - Live timer quick-start
  - Recent sessions list
  - Weekly/monthly practice totals
  - Streak display

- [ ] **Step 10** — Session form
  - Manual entry mode and live timer mode
  - Fields: date, duration, notes, reference URL
  - Song + technique picker with inline creation from library

- [ ] **Step 11** — History page
  - Paginated session list
  - Expand row to full detail
  - Edit and delete actions

- [ ] **Step 12** — Song & Technique library pages
  - Add, edit, delete (soft-delete)
  - Deleted items hidden from library but preserved in session history

### Phase 3 — Docs & CI

- [ ] **Step 13** — MkDocs + GitHub Actions
  - MkDocs Material for docs site
  - GitHub Actions workflow deploys to GitHub Pages on push to `main`
  - Docs already started: `docs/data-model.md`

## Key Design Decisions

- **Soft-delete** on songs/techniques preserves historical session data when library items are removed
- **`session.date` is `DATE`** (not timestamp) — simplifies streak and weekly/monthly aggregation
- **`GET /api/sessions/stats` registered before `GET /api/sessions/:id`** — Express matches top-to-bottom; `stats` must come first or it gets treated as an ID
- **Test DB on `tmpfs`** — `db_test` uses no persistent volume, so it's fast and wipes clean on restart
- **No auth in MVP1** — out of scope, single-user self-hosted app
