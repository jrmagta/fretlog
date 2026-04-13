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

- [x] **Step 7** — Stats endpoint
  - `GET /api/sessions/stats` registered before `/:id` to avoid route shadowing
  - Streak uses SQL window functions + CTE grouping; streak resets if last session > 1 day ago
  - Bug fixed: window functions cannot be used in WHERE — moved to CASE in SELECT
  - 55/55 tests passing

### Phase 2 — Frontend

- [x] **Step 8** — Frontend scaffold
  - Vite + React + TypeScript, `docker-compose.yml` frontend service on port 5173
  - Vite proxy: `/api` → `http://backend:3000` (no CORS config needed)
  - Typed fetch wrappers in `src/api/` (sessions, songs, techniques + shared types)

- [x] **Step 9** — Dashboard page
  - "Sacred Resonance" design system from DESIGN.md (Space Grotesk + Manrope, void dark, burnt orange/gold)
  - Live timer with glassmorphism card + pulsing amber glow when active
  - Stats bar: streak, week total, month total
  - Recent sessions list with tonal date strip, no borders
  - Quick-log manual entry form with ghost border inputs
  - Pure utility functions extracted to `src/utils/dates.ts` with Vitest unit tests
  - Bug fixed: date parsing now uses `.slice(0, 10)` to handle both `YYYY-MM-DD` and full ISO strings

- [x] **Step 10** — Session form
  - Full-page form at `/sessions/new` and `/sessions/:id/edit`
  - Tag-style LibraryPicker component for songs + techniques with inline creation
  - Syncs attachments on edit (diffs original vs selected, attaches/detaches)
  - react-router-dom added for navigation
  - Hostname access via `jr-pc1.jrmagta.home` — `allowedHosts` in vite.config.ts

- [x] **Step 10.5** — Frontend component tests
  - Vitest jsdom environment + React Testing Library + jest-dom
  - `LibraryPicker`: 13 tests (rendering, chip interaction, inline creation)
  - `Dashboard`: 21 tests (data loading, session cards, quick log form, flash timing, timer with fake timers)
  - `SessionForm` create mode: 10 tests (rendering, submission, song attachment, inline creation)
  - `SessionForm` edit mode: 13 tests (loading, pre-population, update vs create, syncAttachments)
  - 78/78 tests passing
  - Fix: fake-timer tests use `act()+fireEvent` instead of `userEvent.click` — RTL's internal polling hangs when `setInterval` is frozen by `vi.useFakeTimers()`

- [x] **Step 11** — History page
  - Paginated session list at `/sessions` (20 per page, prev/next pagination)
  - Expand row to fetch and show full detail inline (songs, techniques, notes, reference URL)
  - Edit action links to `/sessions/:id/edit`
  - Delete with inline confirmation — no browser dialog
  - Dashboard "View all sessions →" footer link added

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
