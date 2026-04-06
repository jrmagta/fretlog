# Frontend Component Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add thorough Vitest + React Testing Library tests for `LibraryPicker`, `Dashboard`, and `SessionForm`.

**Architecture:** Four test files split by component and by SessionForm mode. API modules mocked with `vi.mock()`. Timer tests use `vi.useFakeTimers()` with `userEvent.setup({ advanceTimers })`. No MSW.

**Tech Stack:** `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, Vitest jsdom environment.

---

## File Map

| Action | Path |
|---|---|
| Modify | `frontend/package.json` |
| Modify | `frontend/vite.config.ts` |
| Create | `frontend/src/test/setup.ts` |
| Create | `frontend/src/components/LibraryPicker.test.tsx` |
| Create | `frontend/src/pages/Dashboard.test.tsx` |
| Create | `frontend/src/pages/SessionForm.create.test.tsx` |
| Create | `frontend/src/pages/SessionForm.edit.test.tsx` |

---

## Task 1: Install dependencies and configure Vitest environment

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.ts`
- Create: `frontend/src/test/setup.ts`

- [ ] **Step 1: Install the three new dev dependencies**

```bash
cd frontend
npm install --save-dev @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

Expected: packages added to `node_modules`, `package-lock.json` updated.

- [ ] **Step 2: Update `frontend/vite.config.ts`**

Replace the file with:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

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
    allowedHosts: ['jr-pc1.jrmagta.home'],
    proxy: {
      '/api': {
        target: 'http://backend:3000',
        changeOrigin: true,
      },
    },
  },
});
```

Note: import changed from `'vite'` to `'vitest/config'` — this provides TypeScript types for the `test` block while retaining all Vite plugin/server options.

- [ ] **Step 3: Create `frontend/src/test/setup.ts`**

```ts
import '@testing-library/jest-dom';
```

- [ ] **Step 4: Confirm existing tests still pass**

```bash
cd frontend && npm test
```

Expected:
```
Test Files  2 passed (2)
     Tests  21 passed (21)
```

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vite.config.ts frontend/src/test/setup.ts
git commit -m "Configure Vitest jsdom environment and install React Testing Library"
```

---

## Task 2: LibraryPicker tests

**Files:**
- Create: `frontend/src/components/LibraryPicker.test.tsx`

- [ ] **Step 1: Create the test file**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LibraryPicker from './LibraryPicker';

const baseProps = {
  heading: 'Songs',
  items: [] as { id: number; label: string }[],
  selectedIds: [] as number[],
  onToggle: vi.fn(),
  onCreate: vi.fn<[], Promise<void>>().mockResolvedValue(undefined),
  createPlaceholder: 'Add a song…',
};

beforeEach(() => {
  vi.clearAllMocks();
  baseProps.onCreate.mockResolvedValue(undefined);
});

describe('rendering', () => {
  it('shows the heading', () => {
    render(<LibraryPicker {...baseProps} />);
    expect(screen.getByText('Songs')).toBeInTheDocument();
  });

  it('shows empty-state message when items is empty', () => {
    render(<LibraryPicker {...baseProps} />);
    expect(screen.getByText(/nothing in your library/i)).toBeInTheDocument();
  });

  it('renders one chip per item', () => {
    render(<LibraryPicker {...baseProps} items={[{ id: 1, label: 'Blackbird' }, { id: 2, label: 'Yesterday' }]} />);
    expect(screen.getByRole('button', { name: 'Blackbird' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yesterday' })).toBeInTheDocument();
  });

  it('active chip has the chip-active class', () => {
    render(<LibraryPicker {...baseProps} items={[{ id: 1, label: 'Blackbird' }]} selectedIds={[1]} />);
    expect(screen.getByRole('button', { name: 'Blackbird' })).toHaveClass('chip-active');
  });

  it('inactive chip does not have the chip-active class', () => {
    render(<LibraryPicker {...baseProps} items={[{ id: 1, label: 'Blackbird' }]} selectedIds={[]} />);
    expect(screen.getByRole('button', { name: 'Blackbird' })).not.toHaveClass('chip-active');
  });
});

describe('chip interaction', () => {
  it('clicking a chip calls onToggle with its id', async () => {
    const onToggle = vi.fn();
    render(<LibraryPicker {...baseProps} items={[{ id: 1, label: 'Blackbird' }]} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('button', { name: 'Blackbird' }));
    expect(onToggle).toHaveBeenCalledOnce();
    expect(onToggle).toHaveBeenCalledWith(1);
  });

  it('clicking an active chip also calls onToggle (parent owns toggle state)', async () => {
    const onToggle = vi.fn();
    render(<LibraryPicker {...baseProps} items={[{ id: 1, label: 'Blackbird' }]} selectedIds={[1]} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('button', { name: 'Blackbird' }));
    expect(onToggle).toHaveBeenCalledWith(1);
  });
});

describe('inline creation', () => {
  it('submit button is disabled when input is empty', () => {
    render(<LibraryPicker {...baseProps} />);
    expect(screen.getByRole('button', { name: /add/i })).toBeDisabled();
  });

  it('submit button is disabled when input is whitespace only', async () => {
    render(<LibraryPicker {...baseProps} />);
    await userEvent.type(screen.getByRole('textbox'), '   ');
    expect(screen.getByRole('button', { name: /add/i })).toBeDisabled();
  });

  it('calls onCreate with the trimmed label on submit', async () => {
    const onCreate = vi.fn<[], Promise<void>>().mockResolvedValue(undefined);
    render(<LibraryPicker {...baseProps} onCreate={onCreate} />);
    await userEvent.type(screen.getByRole('textbox'), ' Blackbird ');
    await userEvent.click(screen.getByRole('button', { name: /add/i }));
    expect(onCreate).toHaveBeenCalledOnce();
    expect(onCreate).toHaveBeenCalledWith('Blackbird');
  });

  it('clears the input after successful creation', async () => {
    const onCreate = vi.fn<[], Promise<void>>().mockResolvedValue(undefined);
    render(<LibraryPicker {...baseProps} onCreate={onCreate} />);
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'Blackbird');
    await userEvent.click(screen.getByRole('button', { name: /add/i }));
    expect(input).toHaveValue('');
  });

  it('shows spinner and disables input while onCreate is in-flight', async () => {
    let resolveCreate!: () => void;
    const onCreate = vi.fn().mockReturnValue(new Promise<void>(r => { resolveCreate = r; }));
    render(<LibraryPicker {...baseProps} onCreate={onCreate} />);
    await userEvent.type(screen.getByRole('textbox'), 'Blackbird');

    // Don't await — we want to inspect in-flight state
    userEvent.click(screen.getByRole('button', { name: /add/i }));

    // findByText polls via waitFor until '…' appears (creating=true)
    await screen.findByText('…');
    expect(screen.getByRole('textbox')).toBeDisabled();

    // Clean up: resolve and let the click finish
    resolveCreate();
    await screen.findByText('+'); // creating=false
  });

  it('does not call onCreate when label is whitespace only', async () => {
    const onCreate = vi.fn();
    render(<LibraryPicker {...baseProps} onCreate={onCreate} />);
    await userEvent.type(screen.getByRole('textbox'), '   ');
    // Button is disabled — form cannot be submitted
    expect(screen.getByRole('button', { name: /add/i })).toBeDisabled();
    expect(onCreate).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests**

```bash
cd frontend && npm test src/components/LibraryPicker.test.tsx
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/LibraryPicker.test.tsx
git commit -m "Add thorough LibraryPicker component tests"
```

---

## Task 3: Dashboard — data loading and session rendering

**Files:**
- Create: `frontend/src/pages/Dashboard.test.tsx` (initial version, extended in Tasks 4 and 5)

Note: `sessionsApi` is mocked at the module level. `vi.mock` is hoisted above imports by Vitest, so the mock is in place before `Dashboard` imports the module.

The `'../api/sessions'` path in the mock matches the relative path used by `Dashboard.tsx` from `src/pages/`.

- [ ] **Step 1: Create `frontend/src/pages/Dashboard.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';
import { sessionsApi } from '../api/sessions';
import type { Session, Stats } from '../api/types';

vi.mock('../api/sessions', () => ({
  sessionsApi: {
    stats: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
  },
}));

// ── Shared fixtures ──────────────────────────────────────────────────────────

const mockStats: Stats = { streak_days: 5, week_minutes: 120, month_minutes: 480 };

const mockSession: Session = {
  id: 1,
  date: '2026-04-05',
  duration_minutes: 75,
  notes: 'Scales practice',
  reference_url: null,
  created_at: '2026-04-05T10:00:00.000Z',
  songs: [{ id: 1, title: 'Blackbird', artist: null, reference_url: null, created_at: '' }],
  techniques: [{ id: 2, name: 'Fingerpicking', category: null, reference_url: null, created_at: '' }],
};

const emptySessions = { data: [], total: 0, limit: 5, offset: 0 };
const oneSession = { data: [mockSession], total: 1, limit: 5, offset: 0 };

const mockCreate: Session = {
  id: 99, date: '2026-04-06', duration_minutes: 45, notes: null,
  reference_url: null, created_at: '', songs: [], techniques: [],
};

function renderDashboard() {
  return render(<MemoryRouter><Dashboard /></MemoryRouter>);
}

// ── Data loading ─────────────────────────────────────────────────────────────

describe('data loading', () => {
  it('shows loading state on initial render before data arrives', () => {
    vi.mocked(sessionsApi.stats).mockReturnValue(new Promise(() => {}));
    vi.mocked(sessionsApi.list).mockReturnValue(new Promise(() => {}));
    renderDashboard();
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('shows stats after data loads', async () => {
    vi.mocked(sessionsApi.stats).mockResolvedValue(mockStats);
    vi.mocked(sessionsApi.list).mockResolvedValue(emptySessions);
    renderDashboard();
    await screen.findByText(/no sessions yet/i); // loading done
    // streak_days: 5, week: 120m → '2h', month: 480m → '8h'
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2h')).toBeInTheDocument();
    expect(screen.getByText('8h')).toBeInTheDocument();
  });

  it('shows dash placeholders while stats are loading', () => {
    vi.mocked(sessionsApi.stats).mockReturnValue(new Promise(() => {}));
    vi.mocked(sessionsApi.list).mockReturnValue(new Promise(() => {}));
    renderDashboard();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3);
  });

  it('shows empty-state message when sessions list is empty', async () => {
    vi.mocked(sessionsApi.stats).mockResolvedValue(mockStats);
    vi.mocked(sessionsApi.list).mockResolvedValue(emptySessions);
    renderDashboard();
    expect(await screen.findByText(/no sessions yet/i)).toBeInTheDocument();
  });
});

// ── Session cards ─────────────────────────────────────────────────────────────

describe('session cards', () => {
  beforeEach(() => {
    vi.mocked(sessionsApi.stats).mockResolvedValue(mockStats);
    vi.mocked(sessionsApi.list).mockResolvedValue(oneSession);
  });

  it('renders date strip with month and day', async () => {
    renderDashboard();
    expect(await screen.findByText('APR')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders duration', async () => {
    renderDashboard();
    await screen.findByText('APR');
    expect(screen.getByText('1h 15m')).toBeInTheDocument(); // formatMinutes(75)
  });

  it('renders notes', async () => {
    renderDashboard();
    expect(await screen.findByText('Scales practice')).toBeInTheDocument();
  });

  it('renders song and technique tags', async () => {
    renderDashboard();
    await screen.findByText('Scales practice');
    expect(screen.getByText('Blackbird')).toBeInTheDocument();
    expect(screen.getByText('Fingerpicking')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests**

```bash
cd frontend && npm test src/pages/Dashboard.test.tsx
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Dashboard.test.tsx
git commit -m "Add Dashboard data loading and session card tests"
```

---

## Task 4: Dashboard — quick log form

**Files:**
- Modify: `frontend/src/pages/Dashboard.test.tsx` (append new describe blocks)

- [ ] **Step 1: Append quick log tests to `Dashboard.test.tsx`**

Add after the `session cards` describe block:

```tsx
// ── Quick log form ────────────────────────────────────────────────────────────

describe('quick log form', () => {
  beforeEach(() => {
    vi.mocked(sessionsApi.stats).mockResolvedValue({ streak_days: 0, week_minutes: 0, month_minutes: 0 });
    vi.mocked(sessionsApi.list).mockResolvedValue(emptySessions);
    vi.mocked(sessionsApi.create).mockResolvedValue(mockCreate);
  });

  it('calls sessionsApi.create with the entered values', async () => {
    const today = new Date().toISOString().split('T')[0];
    renderDashboard();
    await screen.findByText(/no sessions yet/i);

    await userEvent.type(screen.getByLabelText('Minutes'), '45');
    await userEvent.click(screen.getByRole('button', { name: /log session/i }));

    expect(sessionsApi.create).toHaveBeenCalledWith({
      date: today,
      duration_minutes: 45,
      notes: undefined,
      reference_url: undefined,
    });
  });

  it('resets duration to empty after submit', async () => {
    renderDashboard();
    await screen.findByText(/no sessions yet/i);

    const durationInput = screen.getByLabelText('Minutes');
    await userEvent.type(durationInput, '45');
    await userEvent.click(screen.getByRole('button', { name: /log session/i }));

    expect(durationInput).toHaveValue(null); // number input cleared
  });

  it('does not submit when duration is 0', async () => {
    renderDashboard();
    await screen.findByText(/no sessions yet/i);

    await userEvent.type(screen.getByLabelText('Minutes'), '0');
    await userEvent.click(screen.getByRole('button', { name: /log session/i }));

    expect(sessionsApi.create).not.toHaveBeenCalled();
  });

  it('does not submit when duration field is empty', async () => {
    renderDashboard();
    await screen.findByText(/no sessions yet/i);

    await userEvent.click(screen.getByRole('button', { name: /log session/i }));

    expect(sessionsApi.create).not.toHaveBeenCalled();
  });

  it('shows Saved flash immediately after submit', async () => {
    renderDashboard();
    await screen.findByText(/no sessions yet/i);

    await userEvent.type(screen.getByLabelText('Minutes'), '45');
    await userEvent.click(screen.getByRole('button', { name: /log session/i }));

    expect(screen.getByText(/saved/i)).toBeInTheDocument();
  });
});

// ── Quick log flash timing (fake timers) ─────────────────────────────────────

describe('quick log flash timing', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.useFakeTimers();
    user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    vi.mocked(sessionsApi.stats).mockResolvedValue({ streak_days: 0, week_minutes: 0, month_minutes: 0 });
    vi.mocked(sessionsApi.list).mockResolvedValue(emptySessions);
    vi.mocked(sessionsApi.create).mockResolvedValue(mockCreate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('flash disappears after 2.2 seconds', async () => {
    renderDashboard();
    // Flush async data load (mockResolvedValue resolves via microtasks, unaffected by fake timers)
    await act(async () => {});

    await user.type(screen.getByLabelText('Minutes'), '45');
    await user.click(screen.getByRole('button', { name: /log session/i }));

    expect(screen.getByText(/saved/i)).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(2200); });

    expect(screen.queryByText(/saved/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests**

```bash
cd frontend && npm test src/pages/Dashboard.test.tsx
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Dashboard.test.tsx
git commit -m "Add Dashboard quick log form tests"
```

---

## Task 5: Dashboard — timer

**Files:**
- Modify: `frontend/src/pages/Dashboard.test.tsx` (append timer describe block)

Key detail: the timer card (`00:00`, "Ready", "Start Practice") is rendered immediately, before the async data load completes. Timer tests can interact with it without waiting for stats/sessions.

`Math.round(20/60) = 0` → `Math.max(1, 0) = 1` minute (short session floor).
`Math.round(90/60) = 2` → `Math.max(1, 2) = 2` minutes.

- [ ] **Step 1: Append timer tests to `Dashboard.test.tsx`**

Add after the `quick log flash timing` describe block:

```tsx
// ── Timer (fake timers) ───────────────────────────────────────────────────────

describe('timer', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.useFakeTimers();
    user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    vi.mocked(sessionsApi.stats).mockResolvedValue({ streak_days: 0, week_minutes: 0, month_minutes: 0 });
    vi.mocked(sessionsApi.list).mockResolvedValue(emptySessions);
    vi.mocked(sessionsApi.create).mockResolvedValue(mockCreate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows 00:00, Ready, and Start Practice on initial render', () => {
    renderDashboard();
    expect(screen.getByText('00:00')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start practice/i })).toBeInTheDocument();
  });

  it('shows Practicing and End Session after clicking Start', async () => {
    renderDashboard();
    await user.click(screen.getByRole('button', { name: /start practice/i }));
    expect(screen.getByText('Practicing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /end session/i })).toBeInTheDocument();
  });

  it('advances elapsed display as time passes', async () => {
    renderDashboard();
    await user.click(screen.getByRole('button', { name: /start practice/i }));
    act(() => { vi.advanceTimersByTime(90_000); }); // 90 seconds
    expect(screen.getByText('01:30')).toBeInTheDocument();
  });

  it('calls sessionsApi.create with duration in minutes when stopped', async () => {
    renderDashboard();
    await user.click(screen.getByRole('button', { name: /start practice/i }));
    act(() => { vi.advanceTimersByTime(90_000); }); // 90s → Math.round(1.5) = 2 minutes
    await user.click(screen.getByRole('button', { name: /end session/i }));
    expect(sessionsApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ duration_minutes: 2 }),
    );
  });

  it('rounds short sessions up to 1 minute minimum', async () => {
    renderDashboard();
    await user.click(screen.getByRole('button', { name: /start practice/i }));
    act(() => { vi.advanceTimersByTime(20_000); }); // 20s → Math.round(0.33) = 0 → max(1,0) = 1
    await user.click(screen.getByRole('button', { name: /end session/i }));
    expect(sessionsApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ duration_minutes: 1 }),
    );
  });

  it('resets display to 00:00 and Ready state after stopping', async () => {
    renderDashboard();
    await user.click(screen.getByRole('button', { name: /start practice/i }));
    act(() => { vi.advanceTimersByTime(60_000); });
    await user.click(screen.getByRole('button', { name: /end session/i }));
    expect(screen.getByText('00:00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start practice/i })).toBeInTheDocument();
  });

  it('shows Saved flash after stopping', async () => {
    renderDashboard();
    await user.click(screen.getByRole('button', { name: /start practice/i }));
    act(() => { vi.advanceTimersByTime(60_000); });
    await user.click(screen.getByRole('button', { name: /end session/i }));
    expect(screen.getByText(/saved/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests**

```bash
cd frontend && npm test src/pages/Dashboard.test.tsx
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Dashboard.test.tsx
git commit -m "Add Dashboard timer tests with fake timers"
```

---

## Task 6: SessionForm — create mode

**Files:**
- Create: `frontend/src/pages/SessionForm.create.test.tsx`

The component uses `useParams` and `useNavigate` from react-router. Wrap in `MemoryRouter` + `Routes` and include a sentinel `/` route so we can assert navigation happened.

The mock for `sessionsApi` must include every method the component calls: `create`, `attachSong`, `attachTechnique`. The `get` and `update` methods are not called in create mode but must exist in the mock object to avoid `undefined is not a function` errors.

- [ ] **Step 1: Create `frontend/src/pages/SessionForm.create.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import SessionForm from './SessionForm';
import { sessionsApi } from '../api/sessions';
import { songsApi } from '../api/songs';
import { techniquesApi } from '../api/techniques';
import type { Session, Song, Technique } from '../api/types';

vi.mock('../api/sessions', () => ({
  sessionsApi: {
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    attachSong: vi.fn(),
    detachSong: vi.fn(),
    attachTechnique: vi.fn(),
    detachTechnique: vi.fn(),
  },
}));
vi.mock('../api/songs', () => ({
  songsApi: { list: vi.fn(), create: vi.fn() },
}));
vi.mock('../api/techniques', () => ({
  techniquesApi: { list: vi.fn(), create: vi.fn() },
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const noSongs: Song[] = [];
const noTechniques: Technique[] = [];

const songBlackbird: Song = { id: 1, title: 'Blackbird', artist: null, reference_url: null, created_at: '' };

const createdSession: Session = {
  id: 5, date: '2026-04-06', duration_minutes: 45,
  notes: null, reference_url: null, created_at: '', songs: [], techniques: [],
};

function renderCreate() {
  return render(
    <MemoryRouter initialEntries={['/sessions/new']}>
      <Routes>
        <Route path="/sessions/new" element={<SessionForm />} />
        <Route path="/" element={<div data-testid="dashboard" />} />
      </Routes>
    </MemoryRouter>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.mocked(songsApi.list).mockResolvedValue(noSongs);
  vi.mocked(techniquesApi.list).mockResolvedValue(noTechniques);
  vi.mocked(sessionsApi.create).mockResolvedValue(createdSession);
  vi.mocked(sessionsApi.attachSong).mockResolvedValue(undefined);
  vi.mocked(sessionsApi.attachTechnique).mockResolvedValue(undefined);
});

describe('create mode rendering', () => {
  it('shows New Session title', () => {
    renderCreate();
    expect(screen.getByText('New Session')).toBeInTheDocument();
  });

  it('does not show loading state', () => {
    renderCreate();
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
  });

  it('loads and renders the songs library', async () => {
    vi.mocked(songsApi.list).mockResolvedValue([songBlackbird]);
    renderCreate();
    expect(await screen.findByRole('button', { name: 'Blackbird' })).toBeInTheDocument();
  });

  it('loads and renders the techniques library', async () => {
    vi.mocked(techniquesApi.list).mockResolvedValue([
      { id: 2, name: 'Fingerpicking', category: null, reference_url: null, created_at: '' },
    ]);
    renderCreate();
    expect(await screen.findByRole('button', { name: 'Fingerpicking' })).toBeInTheDocument();
  });
});

describe('form submission', () => {
  it('calls sessionsApi.create with entered values', async () => {
    const today = new Date().toISOString().split('T')[0];
    renderCreate();

    await userEvent.type(screen.getByLabelText(/duration/i), '45');
    await userEvent.click(screen.getByRole('button', { name: /log session/i }));

    expect(sessionsApi.create).toHaveBeenCalledWith({
      date: today,
      duration_minutes: 45,
      notes: undefined,
      reference_url: undefined,
    });
  });

  it('navigates to / after successful submit', async () => {
    renderCreate();

    await userEvent.type(screen.getByLabelText(/duration/i), '45');
    await userEvent.click(screen.getByRole('button', { name: /log session/i }));

    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });

  it('does not call sessionsApi.create when duration is 0', async () => {
    renderCreate();

    await userEvent.type(screen.getByLabelText(/duration/i), '0');
    await userEvent.click(screen.getByRole('button', { name: /log session/i }));

    expect(sessionsApi.create).not.toHaveBeenCalled();
  });
});

describe('song attachment', () => {
  it('attaches selected songs after creating session', async () => {
    vi.mocked(songsApi.list).mockResolvedValue([songBlackbird]);
    renderCreate();

    await screen.findByRole('button', { name: 'Blackbird' });
    await userEvent.click(screen.getByRole('button', { name: 'Blackbird' }));
    await userEvent.type(screen.getByLabelText(/duration/i), '30');
    await userEvent.click(screen.getByRole('button', { name: /log session/i }));

    expect(sessionsApi.attachSong).toHaveBeenCalledWith(createdSession.id, songBlackbird.id);
  });

  it('does not call attachSong when no songs selected', async () => {
    renderCreate();

    await userEvent.type(screen.getByLabelText(/duration/i), '30');
    await userEvent.click(screen.getByRole('button', { name: /log session/i }));

    expect(sessionsApi.attachSong).not.toHaveBeenCalled();
  });
});

describe('inline song creation', () => {
  it('creates a new song inline, marks it active, and attaches it on submit', async () => {
    const newSong: Song = { id: 10, title: 'Hotel California', artist: null, reference_url: null, created_at: '' };
    vi.mocked(songsApi.create).mockResolvedValue(newSong);
    vi.mocked(sessionsApi.create).mockResolvedValue({ ...createdSession, id: 7 });
    vi.mocked(sessionsApi.attachSong).mockResolvedValue(undefined);

    renderCreate();

    // Type into the Songs picker input and press Enter to submit the picker form
    const songInput = screen.getByPlaceholderText('Add a song…');
    await userEvent.type(songInput, 'Hotel California');
    await userEvent.keyboard('{Enter}');

    // New song appears as an active chip
    expect(await screen.findByRole('button', { name: 'Hotel California' })).toHaveClass('chip-active');

    // Submit session form
    await userEvent.type(screen.getByLabelText(/duration/i), '30');
    await userEvent.click(screen.getByRole('button', { name: /log session/i }));

    expect(songsApi.create).toHaveBeenCalledWith({ title: 'Hotel California' });
    expect(sessionsApi.attachSong).toHaveBeenCalledWith(7, 10);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
cd frontend && npm test src/pages/SessionForm.create.test.tsx
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/SessionForm.create.test.tsx
git commit -m "Add SessionForm create mode tests"
```

---

## Task 7: SessionForm — edit mode and syncAttachments

**Files:**
- Create: `frontend/src/pages/SessionForm.edit.test.tsx`

The edit form uses `useParams` to read `:id` and calls `sessionsApi.get(id)` on mount. The session is pre-loaded with `songs: [{ id: 1 }]` — meaning song 1 is currently linked. The library shows songs 1 and 3, so song 3 can be newly attached and song 1 can be detached.

`syncAttachments` logic:
- `toAttach = selectedIds.filter(id => !originalIds.includes(id))`
- `toDetach = originalIds.filter(id => !selectedIds.includes(id))`

- [ ] **Step 1: Create `frontend/src/pages/SessionForm.edit.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import SessionForm from './SessionForm';
import { sessionsApi } from '../api/sessions';
import { songsApi } from '../api/songs';
import { techniquesApi } from '../api/techniques';
import type { Session } from '../api/types';

vi.mock('../api/sessions', () => ({
  sessionsApi: {
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    attachSong: vi.fn(),
    detachSong: vi.fn(),
    attachTechnique: vi.fn(),
    detachTechnique: vi.fn(),
  },
}));
vi.mock('../api/songs', () => ({
  songsApi: { list: vi.fn(), create: vi.fn() },
}));
vi.mock('../api/techniques', () => ({
  techniquesApi: { list: vi.fn(), create: vi.fn() },
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

// Session 5: linked to song id=1, technique id=2
const mockSession: Session = {
  id: 5,
  date: '2026-04-05',
  duration_minutes: 45,
  notes: 'Good practice',
  reference_url: null,
  created_at: '',
  songs: [{ id: 1, title: 'Blackbird', artist: null, reference_url: null, created_at: '' }],
  techniques: [{ id: 2, name: 'Fingerpicking', category: null, reference_url: null, created_at: '' }],
};

function renderEdit() {
  return render(
    <MemoryRouter initialEntries={['/sessions/5/edit']}>
      <Routes>
        <Route path="/sessions/:id/edit" element={<SessionForm />} />
        <Route path="/" element={<div data-testid="dashboard" />} />
      </Routes>
    </MemoryRouter>,
  );
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.mocked(sessionsApi.get).mockResolvedValue(mockSession);
  // Library: song 1 (Blackbird, originally linked) + song 3 (Yesterday, not linked)
  vi.mocked(songsApi.list).mockResolvedValue([
    { id: 1, title: 'Blackbird', artist: null, reference_url: null, created_at: '' },
    { id: 3, title: 'Yesterday', artist: null, reference_url: null, created_at: '' },
  ]);
  // Library: technique 2 (Fingerpicking, originally linked)
  vi.mocked(techniquesApi.list).mockResolvedValue([
    { id: 2, name: 'Fingerpicking', category: null, reference_url: null, created_at: '' },
  ]);
  vi.mocked(sessionsApi.update).mockResolvedValue({ ...mockSession });
  vi.mocked(sessionsApi.attachSong).mockResolvedValue(undefined);
  vi.mocked(sessionsApi.detachSong).mockResolvedValue(undefined);
  vi.mocked(sessionsApi.attachTechnique).mockResolvedValue(undefined);
  vi.mocked(sessionsApi.detachTechnique).mockResolvedValue(undefined);
});

// ── Loading state ─────────────────────────────────────────────────────────────

describe('loading state', () => {
  it('shows loading indicator while sessionsApi.get is in-flight', () => {
    vi.mocked(sessionsApi.get).mockReturnValue(new Promise(() => {}));
    renderEdit();
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('shows Edit Session title once load completes', async () => {
    renderEdit();
    expect(await screen.findByText('Edit Session')).toBeInTheDocument();
  });
});

// ── Pre-population ────────────────────────────────────────────────────────────

describe('pre-population', () => {
  it('fills duration field with session value', async () => {
    renderEdit();
    await screen.findByText('Edit Session');
    expect(screen.getByLabelText(/duration/i)).toHaveValue(45);
  });

  it('fills notes field with session value', async () => {
    renderEdit();
    await screen.findByText('Edit Session');
    expect(screen.getByLabelText(/notes/i)).toHaveValue('Good practice');
  });

  it('marks originally linked song as active', async () => {
    renderEdit();
    await screen.findByText('Edit Session');
    expect(screen.getByRole('button', { name: 'Blackbird' })).toHaveClass('chip-active');
  });

  it('does not mark unlinked song as active', async () => {
    renderEdit();
    await screen.findByText('Edit Session');
    expect(screen.getByRole('button', { name: 'Yesterday' })).not.toHaveClass('chip-active');
  });
});

// ── Submit calls update ───────────────────────────────────────────────────────

describe('form submission', () => {
  it('calls sessionsApi.update (not create) on submit', async () => {
    renderEdit();
    await screen.findByText('Edit Session');

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(sessionsApi.update).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ duration_minutes: 45, notes: 'Good practice' }),
    );
    expect(sessionsApi.create).not.toHaveBeenCalled();
  });

  it('navigates to / after successful submit', async () => {
    renderEdit();
    await screen.findByText('Edit Session');

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });
});

// ── syncAttachments ───────────────────────────────────────────────────────────

describe('syncAttachments', () => {
  it('attaches a newly selected song and leaves the original alone', async () => {
    renderEdit();
    await screen.findByText('Edit Session');

    // Yesterday (id=3) is not currently linked — select it
    await userEvent.click(screen.getByRole('button', { name: 'Yesterday' }));
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(sessionsApi.attachSong).toHaveBeenCalledWith(5, 3);
    expect(sessionsApi.detachSong).not.toHaveBeenCalled();
  });

  it('detaches a deselected song and leaves unrelated songs alone', async () => {
    renderEdit();
    await screen.findByText('Edit Session');

    // Blackbird (id=1) is currently linked — deselect it
    await userEvent.click(screen.getByRole('button', { name: 'Blackbird' }));
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(sessionsApi.detachSong).toHaveBeenCalledWith(5, 1);
    expect(sessionsApi.attachSong).not.toHaveBeenCalled();
  });

  it('makes no attach or detach calls when songs are unchanged', async () => {
    renderEdit();
    await screen.findByText('Edit Session');

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(sessionsApi.attachSong).not.toHaveBeenCalled();
    expect(sessionsApi.detachSong).not.toHaveBeenCalled();
  });

  it('attaches a newly selected technique and leaves the original alone', async () => {
    // Add a second technique to the library that is not linked
    vi.mocked(techniquesApi.list).mockResolvedValue([
      { id: 2, name: 'Fingerpicking', category: null, reference_url: null, created_at: '' },
      { id: 4, name: 'Vibrato', category: null, reference_url: null, created_at: '' },
    ]);

    renderEdit();
    await screen.findByText('Edit Session');

    // Vibrato (id=4) is not currently linked — select it
    await userEvent.click(screen.getByRole('button', { name: 'Vibrato' }));
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(sessionsApi.attachTechnique).toHaveBeenCalledWith(5, 4);
    expect(sessionsApi.detachTechnique).not.toHaveBeenCalled();
  });

  it('detaches a deselected technique', async () => {
    renderEdit();
    await screen.findByText('Edit Session');

    // Fingerpicking (id=2) is currently linked — deselect it
    await userEvent.click(screen.getByRole('button', { name: 'Fingerpicking' }));
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(sessionsApi.detachTechnique).toHaveBeenCalledWith(5, 2);
    expect(sessionsApi.attachTechnique).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests**

```bash
cd frontend && npm test src/pages/SessionForm.edit.test.tsx
```

Expected: all tests pass.

- [ ] **Step 3: Run full frontend test suite**

```bash
cd frontend && npm test
```

Expected: all test files pass.

- [ ] **Step 4: Check coverage**

```bash
cd frontend && npm run test:coverage
```

Expected: `src/components/LibraryPicker.tsx`, `src/pages/Dashboard.tsx`, and `src/pages/SessionForm.tsx` now show meaningful coverage in the report.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/SessionForm.edit.test.tsx
git commit -m "Add SessionForm edit mode and syncAttachments tests"
```
