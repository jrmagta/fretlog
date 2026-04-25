# Playwright E2E Test Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Playwright E2E test suite with 5 smoke tests that exercise the core fretlog flows against a parallel test stack.

**Architecture:** A separate `docker-compose.e2e.yml` runs `db_e2e`, `backend_e2e`, and `frontend_e2e` on dedicated ports (5434/3001/5174) alongside the dev stack. The backend exposes a `POST /api/test/reset` route mounted only when `NODE_ENV=test`. Playwright lives in a top-level `e2e/` package and calls the reset endpoint before each test.

**Tech Stack:** Playwright (Chromium), TypeScript, Express, Vite, Postgres 16, podman-compose.

**Spec:** `docs/superpowers/specs/2026-04-25-playwright-e2e-design.md`

---

## File Structure

**Create:**
- `backend/src/routes/test.ts` — reset router
- `backend/src/tests/test-route.test.ts` — test for reset endpoint
- `docker-compose.e2e.yml` — parallel stack
- `e2e/package.json` — Playwright dependencies
- `e2e/playwright.config.ts` — Playwright config
- `e2e/.gitignore` — ignore node_modules, test-results, playwright-report
- `e2e/helpers/reset-db.ts` — reset helper
- `e2e/helpers/seed.ts` — API seed helpers
- `e2e/tests/dashboard-timer.spec.ts`
- `e2e/tests/log-session.spec.ts`
- `e2e/tests/history-view.spec.ts`
- `e2e/tests/edit-session.spec.ts`
- `e2e/tests/library.spec.ts`
- `e2e/run.sh` — one-shot script
- `package.json` (repo root) — top-level npm scripts wrapper

**Modify:**
- `backend/src/app.ts` — conditionally mount test router
- `backend/package.json` — add `NODE_ENV=test` to the test scripts
- `frontend/vite.config.ts` — read proxy target from env var
- `PLAN.md` — add Step 16
- `docs/index.md` — document E2E suite under "Development"

---

## Task 1: Backend test-reset route (TDD)

**Files:**
- Create: `backend/src/routes/test.ts`
- Create: `backend/src/tests/test-route.test.ts`
- Modify: `backend/src/app.ts`
- Modify: `backend/package.json` (add `NODE_ENV=test` to `test` and `test:watch` scripts)

- [ ] **Step 1.1: Update backend test scripts to set NODE_ENV=test**

Edit `backend/package.json`:

```json
"test": "NODE_ENV=test DATABASE_URL=postgresql://fretlog:fretlog@localhost:5433/fretlog_test vitest run",
"test:watch": "NODE_ENV=test DATABASE_URL=postgresql://fretlog:fretlog@localhost:5433/fretlog_test vitest"
```

Existing tests don't depend on NODE_ENV, so they continue to pass. The new var lets `app.ts` mount the test router during tests.

- [ ] **Step 1.2: Run existing backend tests to confirm baseline still passes**

```bash
cd backend && npm test
```

Expected: existing test count passes (whatever the current count is; no regressions).

- [ ] **Step 1.3: Write the failing test for the reset route**

Create `backend/src/tests/test-route.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import { setupTestDb, teardownTestDb } from './helpers';
import { pool } from '../db';

beforeAll(async () => {
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

describe('POST /api/test/reset', () => {
  it('truncates all tables and returns 204', async () => {
    await request(app).post('/api/sessions').send({ date: '2026-04-01', duration_minutes: 30 });
    await request(app).post('/api/songs').send({ title: 'Wonderwall', artist: 'Oasis' });

    const before = await pool.query('SELECT COUNT(*)::int AS n FROM sessions');
    expect(before.rows[0].n).toBeGreaterThan(0);

    const res = await request(app).post('/api/test/reset');
    expect(res.status).toBe(204);

    const sessions = await pool.query('SELECT COUNT(*)::int AS n FROM sessions');
    const songs = await pool.query('SELECT COUNT(*)::int AS n FROM songs');
    expect(sessions.rows[0].n).toBe(0);
    expect(songs.rows[0].n).toBe(0);
  });
});
```

- [ ] **Step 1.4: Run the test to verify it fails**

```bash
cd backend && npx vitest run src/tests/test-route.test.ts
```

Expected: FAIL with 404 on `POST /api/test/reset` (route doesn't exist yet).

- [ ] **Step 1.5: Implement the test router**

Create `backend/src/routes/test.ts`:

```ts
import { Router, Request, Response } from 'express';
import { pool } from '../db';

const router = Router();

router.post('/reset', async (_req: Request, res: Response) => {
  await pool.query(
    'TRUNCATE sessions, session_songs, session_techniques, songs, techniques RESTART IDENTITY CASCADE'
  );
  res.status(204).end();
});

export default router;
```

- [ ] **Step 1.6: Mount the router conditionally in app.ts**

Edit `backend/src/app.ts`. Add the import after the other route imports and the conditional mount after the existing `app.use('/api/techniques', ...)` line:

```ts
import express from 'express';
import cors from 'cors';
import { pool } from './db';
import sessionsRouter from './routes/sessions';
import songsRouter from './routes/songs';
import techniquesRouter from './routes/techniques';
import testRouter from './routes/test';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/sessions', sessionsRouter);
app.use('/api/songs', songsRouter);
app.use('/api/techniques', techniquesRouter);

if (process.env.NODE_ENV === 'test') {
  app.use('/api/test', testRouter);
}

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (err) {
    res.status(503).json({ ok: false, error: String(err) });
  }
});

export default app;
```

- [ ] **Step 1.7: Run the new test to verify it passes**

```bash
cd backend && npx vitest run src/tests/test-route.test.ts
```

Expected: 1 PASS.

- [ ] **Step 1.8: Run the full backend test suite to confirm no regressions**

```bash
cd backend && npm test
```

Expected: all tests pass.

- [ ] **Step 1.9: Commit**

```bash
git add backend/src/routes/test.ts backend/src/tests/test-route.test.ts backend/src/app.ts backend/package.json
git commit -m "Add NODE_ENV=test gated reset endpoint for E2E tests"
```

---

## Task 2: Frontend Vite proxy target via env var

**Files:**
- Modify: `frontend/vite.config.ts`

The dev frontend container proxies `/api` to `http://backend:3000`. The E2E frontend container needs to proxy to `http://backend_e2e:3000`. Read the target from `VITE_API_TARGET`, default to current value.

- [ ] **Step 2.1: Update vite.config.ts to read proxy target from env**

Edit `frontend/vite.config.ts`. Replace the proxy block:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const apiTarget = process.env.VITE_API_TARGET ?? 'http://backend:3000';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['jr-pc1.jrmagta.home', 'jr-pc2.jrmagta.home'],
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 2.2: Verify dev frontend still works**

If the dev stack is up, hit the dashboard in a browser and confirm sessions load. If not running, restart with `podman-compose up -d` and check `http://localhost:5173`.

- [ ] **Step 2.3: Commit**

```bash
git add frontend/vite.config.ts
git commit -m "Make Vite proxy target configurable via VITE_API_TARGET"
```

---

## Task 3: docker-compose.e2e.yml

**Files:**
- Create: `docker-compose.e2e.yml`

Parallel stack on dedicated ports. Uses tmpfs for the DB to wipe state on every restart and keep things fast.

- [ ] **Step 3.1: Create the compose file**

Create `docker-compose.e2e.yml` at the repo root:

```yaml
services:
  db_e2e:
    image: docker.io/library/postgres:16
    environment:
      POSTGRES_DB: fretlog_e2e
      POSTGRES_USER: fretlog
      POSTGRES_PASSWORD: fretlog
    ports:
      - "5434:5432"
    tmpfs:
      - /var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U fretlog -d fretlog_e2e"]
      interval: 2s
      timeout: 3s
      retries: 10

  backend_e2e:
    build: ./backend
    environment:
      NODE_ENV: test
      DATABASE_URL: postgresql://fretlog:fretlog@db_e2e:5432/fretlog_e2e
    ports:
      - "3001:3000"
    depends_on:
      db_e2e:
        condition: service_healthy
    security_opt:
      - label=disable
    volumes:
      - ./backend/src:/app/src

  frontend_e2e:
    build: ./frontend
    environment:
      VITE_API_TARGET: http://backend_e2e:3000
    ports:
      - "5174:5173"
    depends_on:
      - backend_e2e
    security_opt:
      - label=disable
    volumes:
      - ./frontend/src:/app/src
```

- [ ] **Step 3.2: Bring the e2e stack up and verify health**

```bash
podman-compose -f docker-compose.e2e.yml up -d
```

Wait ~20 seconds for the build/migrate/start sequence, then:

```bash
curl -s http://localhost:3001/api/health
```

Expected: `{"ok":true}`.

```bash
curl -sX POST http://localhost:3001/api/test/reset -o /dev/null -w "%{http_code}\n"
```

Expected: `204`.

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5174
```

Expected: `200`.

- [ ] **Step 3.3: Tear down**

```bash
podman-compose -f docker-compose.e2e.yml down
```

- [ ] **Step 3.4: Commit**

```bash
git add docker-compose.e2e.yml
git commit -m "Add parallel E2E compose stack on ports 5434/3001/5174"
```

---

## Task 4: e2e/ package skeleton

**Files:**
- Create: `e2e/package.json`
- Create: `e2e/playwright.config.ts`
- Create: `e2e/.gitignore`
- Create: `e2e/tsconfig.json`

- [ ] **Step 4.1: Create e2e/package.json**

```json
{
  "name": "fretlog-e2e",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "playwright test",
    "test:ui": "playwright test --ui"
  },
  "devDependencies": {
    "@playwright/test": "^1.48.0",
    "@types/node": "^20.12.7",
    "typescript": "^5.4.5"
  }
}
```

- [ ] **Step 4.2: Create e2e/.gitignore**

```
node_modules/
test-results/
playwright-report/
playwright/.cache/
```

- [ ] **Step 4.3: Create e2e/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "types": ["node"]
  },
  "include": ["**/*.ts"]
}
```

- [ ] **Step 4.4: Create e2e/playwright.config.ts**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
```

`fullyParallel: false` and `workers: 1` because all tests share one DB and truncate between tests; running them in parallel would interleave state.

- [ ] **Step 4.5: Install Playwright and download Chromium**

```bash
cd e2e && npm install && npx playwright install chromium
```

Expected: install succeeds; Chromium downloaded.

- [ ] **Step 4.6: Verify Playwright works (no tests yet)**

```bash
cd e2e && npx playwright test --list
```

Expected: "0 tests found" (no spec files yet) — this just confirms the config loads.

- [ ] **Step 4.7: Commit**

```bash
git add e2e/package.json e2e/package-lock.json e2e/.gitignore e2e/tsconfig.json e2e/playwright.config.ts
git commit -m "Scaffold e2e/ Playwright package"
```

---

## Task 5: Reset and seed helpers

**Files:**
- Create: `e2e/helpers/reset-db.ts`
- Create: `e2e/helpers/seed.ts`

- [ ] **Step 5.1: Create reset helper**

Create `e2e/helpers/reset-db.ts`:

```ts
const BACKEND_URL = 'http://localhost:3001';

export async function resetDb(): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/test/reset`, { method: 'POST' });
  if (res.status !== 204) {
    throw new Error(`Reset failed: ${res.status} ${await res.text()}`);
  }
}
```

- [ ] **Step 5.2: Create seed helpers**

Create `e2e/helpers/seed.ts`:

```ts
const BACKEND_URL = 'http://localhost:3001';

export async function createSession(input: {
  date: string;
  duration_minutes: number;
  notes?: string;
  reference_url?: string;
}): Promise<{ id: number }> {
  const res = await fetch(`${BACKEND_URL}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`createSession failed: ${res.status}`);
  return res.json();
}

export async function createSong(input: {
  title: string;
  artist?: string;
}): Promise<{ id: number }> {
  const res = await fetch(`${BACKEND_URL}/api/songs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`createSong failed: ${res.status}`);
  return res.json();
}

export async function createTechnique(input: {
  name: string;
  category?: string;
}): Promise<{ id: number }> {
  const res = await fetch(`${BACKEND_URL}/api/techniques`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`createTechnique failed: ${res.status}`);
  return res.json();
}
```

- [ ] **Step 5.3: Commit**

```bash
git add e2e/helpers/
git commit -m "Add reset and seed helpers for E2E tests"
```

---

## Task 6: Test 1 — dashboard-timer.spec.ts

**Files:**
- Create: `e2e/tests/dashboard-timer.spec.ts`

Goal: timer flow end-to-end. Start the timer, wait briefly, click "End Session", fill the overlay, save, assert the session shows up under "Recent sessions".

- [ ] **Step 6.1: Bring the e2e stack up if not running**

```bash
podman-compose -f docker-compose.e2e.yml up -d
```

- [ ] **Step 6.2: Write the test**

Create `e2e/tests/dashboard-timer.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import { resetDb } from '../helpers/reset-db';

test.beforeEach(async () => {
  await resetDb();
});

test('start timer, end session via overlay, see it in recent sessions', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Start Practice' }).click();
  await expect(page.getByRole('button', { name: 'End Session' })).toBeVisible();

  await page.waitForTimeout(2000);

  await page.getByRole('button', { name: 'End Session' }).click();

  const dialog = page.getByRole('dialog', { name: 'End session' });
  await expect(dialog).toBeVisible();

  await dialog.getByLabel('Notes').fill('Timer smoke test');
  await dialog.getByRole('button', { name: 'Save Session' }).click();

  await expect(dialog).not.toBeVisible();

  const recent = page.locator('.recent-sessions, [class*="recent"]').first();
  await expect(page.getByText('Timer smoke test')).toBeVisible();
});
```

- [ ] **Step 6.3: Run the test**

```bash
cd e2e && npx playwright test dashboard-timer
```

Expected: PASS. If selectors miss (e.g., the Notes label text is different, or the recent-sessions container has a different class), adjust to match the actual DOM. Inspect with `npx playwright test dashboard-timer --headed --debug` if needed.

- [ ] **Step 6.4: Commit**

```bash
git add e2e/tests/dashboard-timer.spec.ts
git commit -m "Add dashboard timer E2E smoke test"
```

---

## Task 7: Test 2 — log-session.spec.ts

**Files:**
- Create: `e2e/tests/log-session.spec.ts`

Goal: manual quick-log on the Dashboard. Fill date, duration, notes; save; assert it appears in Recent.

- [ ] **Step 7.1: Write the test**

Create `e2e/tests/log-session.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import { resetDb } from '../helpers/reset-db';

test.beforeEach(async () => {
  await resetDb();
});

test('manually log a session via the quick-log form', async ({ page }) => {
  await page.goto('/');

  const form = page.locator('form').filter({ hasText: 'Log Session' }).first();
  await form.getByLabel('Duration').fill('25');
  await form.getByLabel('Notes').fill('Manual quick log');
  await form.getByRole('button', { name: 'Log Session' }).click();

  await expect(page.getByText('Manual quick log')).toBeVisible();
  await expect(page.getByText('25 min', { exact: false })).toBeVisible();
});
```

- [ ] **Step 7.2: Run the test**

```bash
cd e2e && npx playwright test log-session
```

Expected: PASS. If the form's labels or duration display format differ from what's written, adjust to match.

- [ ] **Step 7.3: Commit**

```bash
git add e2e/tests/log-session.spec.ts
git commit -m "Add manual quick-log E2E smoke test"
```

---

## Task 8: Test 3 — history-view.spec.ts

**Files:**
- Create: `e2e/tests/history-view.spec.ts`

Goal: seed 3 sessions via API, navigate to /sessions, assert all visible, expand one, assert detail loads.

- [ ] **Step 8.1: Write the test**

Create `e2e/tests/history-view.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import { resetDb } from '../helpers/reset-db';
import { createSession } from '../helpers/seed';

test.beforeEach(async () => {
  await resetDb();
});

test('history shows seeded sessions and expands detail', async ({ page }) => {
  await createSession({ date: '2026-04-20', duration_minutes: 30, notes: 'Session A' });
  await createSession({ date: '2026-04-21', duration_minutes: 45, notes: 'Session B' });
  await createSession({ date: '2026-04-22', duration_minutes: 60, notes: 'Session C' });

  await page.goto('/sessions');

  await expect(page.getByText('Session A')).toBeVisible();
  await expect(page.getByText('Session B')).toBeVisible();
  await expect(page.getByText('Session C')).toBeVisible();

  await page.getByText('Session B').click();
  await expect(page.getByText('45 min', { exact: false })).toBeVisible();
});
```

- [ ] **Step 8.2: Run the test**

```bash
cd e2e && npx playwright test history-view
```

Expected: PASS. If clicking the row text doesn't expand it (because the click handler is on a parent), use `page.locator('tr', { hasText: 'Session B' }).click()` or whatever element is actually clickable.

- [ ] **Step 8.3: Commit**

```bash
git add e2e/tests/history-view.spec.ts
git commit -m "Add history view E2E smoke test"
```

---

## Task 9: Test 4 — edit-session.spec.ts

**Files:**
- Create: `e2e/tests/edit-session.spec.ts`

Goal: seed 1 session, click Edit, change duration and notes, save, assert update reflected.

- [ ] **Step 9.1: Write the test**

Create `e2e/tests/edit-session.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import { resetDb } from '../helpers/reset-db';
import { createSession } from '../helpers/seed';

test.beforeEach(async () => {
  await resetDb();
});

test('edit a seeded session and see the update in history', async ({ page }) => {
  await createSession({
    date: '2026-04-22',
    duration_minutes: 30,
    notes: 'Original notes',
  });

  await page.goto('/sessions');

  await page.getByText('Original notes').click();
  await page.getByRole('link', { name: 'Edit' }).click();

  await expect(page).toHaveURL(/\/sessions\/\d+\/edit/);

  const duration = page.getByLabel('Duration');
  await duration.fill('60');

  const notes = page.getByLabel('Notes');
  await notes.fill('Updated notes');

  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page).toHaveURL(/\/sessions/);
  await expect(page.getByText('Updated notes')).toBeVisible();
  await expect(page.getByText('60 min', { exact: false })).toBeVisible();
});
```

- [ ] **Step 9.2: Run the test**

```bash
cd e2e && npx playwright test edit-session
```

Expected: PASS. Adjust selectors as needed if the Edit link is rendered as a button or the Save button has different text.

- [ ] **Step 9.3: Commit**

```bash
git add e2e/tests/edit-session.spec.ts
git commit -m "Add edit session E2E smoke test"
```

---

## Task 10: Test 5 — library.spec.ts

**Files:**
- Create: `e2e/tests/library.spec.ts`

Goal: navigate to /songs, add a song, edit it inline, delete it.

- [ ] **Step 10.1: Write the test**

Create `e2e/tests/library.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import { resetDb } from '../helpers/reset-db';

test.beforeEach(async () => {
  await resetDb();
});

test('add, edit, and delete a song in the library', async ({ page }) => {
  await page.goto('/songs');

  await page.getByLabel('Title').fill('Wonderwall');
  await page.getByLabel('Artist').fill('Oasis');
  await page.getByRole('button', { name: 'Add' }).click();

  const row = page.locator('tr, li, [class*="row"]').filter({ hasText: 'Wonderwall' }).first();
  await expect(row).toBeVisible();

  await row.getByRole('button', { name: 'Edit' }).click();
  const editTitle = row.getByLabel('Title');
  await editTitle.fill('Wonderwall (acoustic)');
  await row.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByText('Wonderwall (acoustic)')).toBeVisible();

  const editedRow = page.locator('tr, li, [class*="row"]').filter({ hasText: 'Wonderwall (acoustic)' }).first();
  await editedRow.getByRole('button', { name: 'Delete' }).click();
  await editedRow.getByRole('button', { name: /Confirm|Yes|Delete/ }).click();

  await expect(page.getByText('Wonderwall (acoustic)')).not.toBeVisible();
});
```

- [ ] **Step 10.2: Run the test**

```bash
cd e2e && npx playwright test library
```

Expected: PASS. The Library page may use different DOM structure than `tr/li`; if the row selector misses, run with `--headed` and adjust to whatever container holds each item.

- [ ] **Step 10.3: Run all five specs together**

```bash
cd e2e && npx playwright test
```

Expected: 5 PASS.

- [ ] **Step 10.4: Commit**

```bash
git add e2e/tests/library.spec.ts
git commit -m "Add library page E2E smoke test"
```

---

## Task 11: One-shot run script

**Files:**
- Create: `e2e/run.sh`

- [ ] **Step 11.1: Create run.sh**

Create `e2e/run.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

cleanup() {
  echo "Tearing down e2e stack..."
  podman-compose -f docker-compose.e2e.yml down
}
trap cleanup EXIT

echo "Bringing up e2e stack..."
podman-compose -f docker-compose.e2e.yml up -d

echo "Waiting for backend_e2e health..."
for i in {1..60}; do
  if curl -sf http://localhost:3001/api/health > /dev/null; then
    echo "Backend ready."
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "Backend failed to come up within 60s" >&2
    exit 1
  fi
  sleep 1
done

echo "Waiting for frontend_e2e..."
for i in {1..30}; do
  if curl -sf -o /dev/null http://localhost:5174; then
    echo "Frontend ready."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "Frontend failed to come up within 30s" >&2
    exit 1
  fi
  sleep 1
done

echo "Running Playwright..."
cd e2e
npx playwright test
```

- [ ] **Step 11.2: Make it executable**

```bash
chmod +x e2e/run.sh
```

- [ ] **Step 11.3: Verify it works end-to-end**

First make sure the e2e stack is **down** (so the script handles the full lifecycle):

```bash
podman-compose -f docker-compose.e2e.yml down
./e2e/run.sh
```

Expected: stack comes up, all 5 tests pass, stack tears down, exit code 0.

- [ ] **Step 11.4: Commit**

```bash
git add e2e/run.sh
git commit -m "Add one-shot E2E run script"
```

---

## Task 12: Top-level npm wrapper

**Files:**
- Create: `package.json` (repo root, only if it doesn't exist)

If a root `package.json` already exists, modify it instead.

- [ ] **Step 12.1: Check if repo-root package.json exists**

```bash
ls package.json 2>/dev/null && echo "exists" || echo "missing"
```

- [ ] **Step 12.2a: If missing, create it**

```json
{
  "name": "fretlog",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "test:e2e": "./e2e/run.sh"
  }
}
```

- [ ] **Step 12.2b: If it exists, add the script**

Add `"test:e2e": "./e2e/run.sh"` under `scripts`.

- [ ] **Step 12.3: Verify**

```bash
npm run test:e2e
```

Expected: same result as Task 11 (all 5 tests pass).

- [ ] **Step 12.4: Commit**

```bash
git add package.json
git commit -m "Add npm test:e2e wrapper"
```

---

## Task 13: Update PLAN.md and docs

**Files:**
- Modify: `PLAN.md`
- Modify: `docs/index.md`

- [ ] **Step 13.1: Add Step 16 to PLAN.md**

Append after Step 15's section:

```markdown

### Phase 5 — E2E Testing

- [x] **Step 16** — Playwright E2E smoke suite
  - Parallel `docker-compose.e2e.yml` stack on ports 5434 (db), 3001 (backend), 5174 (frontend)
  - `NODE_ENV=test`-gated `POST /api/test/reset` endpoint truncates all tables
  - `e2e/` package with Playwright + Chromium, `fullyParallel: false` (single shared DB)
  - 5 smoke tests: dashboard timer, manual log, history view, edit session, library CRUD
  - `e2e/run.sh` brings up the stack, waits for health, runs tests, tears down
  - `npm run test:e2e` at repo root invokes the script
```

- [ ] **Step 13.2: Add an E2E section to docs/index.md**

`docs/index.md` has a `## Development` section with a `### Running tests` subsection. Add a new `### End-to-end tests` subsection right after `### Running tests`:

```markdown

## End-to-end tests

The E2E suite uses Playwright against a parallel stack on dedicated ports.

**One-shot (clean run):**

\`\`\`bash
npm run test:e2e
\`\`\`

This brings up `docker-compose.e2e.yml` (ports 5434/3001/5174), waits for health, runs all 5 smoke tests, then tears down.

**Iterating during dev:**

\`\`\`bash
podman-compose -f docker-compose.e2e.yml up -d
cd e2e && npx playwright test           # repeat as needed
npx playwright test --ui                # debug UI
\`\`\`

The reset endpoint is only mounted when the backend has `NODE_ENV=test` — the dev and prod servers don't expose it.
```

(Replace the escaped backticks with literal triple backticks when editing.)

- [ ] **Step 13.3: Verify docs build still passes**

```bash
mkdocs build --strict
```

(Run from repo root — `mkdocs.yml` is there.) If `mkdocs` isn't installed locally, skip — the GitHub Action will catch any build issue on push.

- [ ] **Step 13.4: Commit**

```bash
git add PLAN.md docs/index.md
git commit -m "Document E2E suite (Step 16)"
```

---

## Task 14: Final verification

- [ ] **Step 14.1: Confirm dev stack is unaffected**

```bash
podman-compose up -d
curl -s http://localhost:3000/api/health
curl -sX POST http://localhost:3000/api/test/reset -o /dev/null -w "%{http_code}\n"
```

Expected: health returns `{"ok":true}`, reset returns `404` (route not mounted in dev).

- [ ] **Step 14.2: Run E2E suite from scratch**

```bash
podman-compose -f docker-compose.e2e.yml down
npm run test:e2e
```

Expected: 5 tests pass, exit code 0.

- [ ] **Step 14.3: Run backend tests**

```bash
cd backend && npm test
```

Expected: all backend tests pass (existing + the new test-route test).

- [ ] **Step 14.4: Close the tracking issue**

```bash
TOKEN=$(git remote get-url origin | grep -oP 'github_pat_[A-Za-z0-9_]+')
curl -sX PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/jrmagta/fretlog/issues/2 \
  -d '{"state":"closed"}'
```
