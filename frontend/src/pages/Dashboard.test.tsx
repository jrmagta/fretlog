import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';
import { sessionsApi } from '../api/sessions';
import { songsApi } from '../api/songs';
import { techniquesApi } from '../api/techniques';
import type { Session, Stats } from '../api/types';

vi.mock('../api/sessions', () => ({
  sessionsApi: {
    stats: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    attachSong: vi.fn(),
    attachTechnique: vi.fn(),
  },
}));

vi.mock('../api/songs', () => ({
  songsApi: {
    list: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('../api/techniques', () => ({
  techniquesApi: {
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

beforeEach(() => {
  vi.clearAllMocks();
});

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
    expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1);
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
    // day "5" appears in both streak stat and date strip — just confirm presence
    expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1);
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
  beforeEach(() => {
    vi.useFakeTimers();
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

    act(() => {
      fireEvent.change(screen.getByLabelText('Minutes'), { target: { value: '45' } });
    });
    await act(async () => {
      screen.getByRole('button', { name: /log session/i }).click();
    });

    expect(screen.getByText(/saved/i)).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(2200); });

    expect(screen.queryByText(/saved/i)).not.toBeInTheDocument();
  });
});

// ── Timer (fake timers) ───────────────────────────────────────────────────────

describe('timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(sessionsApi.stats).mockResolvedValue({ streak_days: 0, week_minutes: 0, month_minutes: 0 });
    vi.mocked(sessionsApi.list).mockResolvedValue(emptySessions);
    vi.mocked(sessionsApi.create).mockResolvedValue(mockCreate);
    vi.mocked(sessionsApi.attachSong).mockResolvedValue(undefined);
    vi.mocked(sessionsApi.attachTechnique).mockResolvedValue(undefined);
    vi.mocked(songsApi.list).mockResolvedValue([]);
    vi.mocked(techniquesApi.list).mockResolvedValue([]);
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
    await act(async () => {
      screen.getByRole('button', { name: /start practice/i }).click();
    });
    expect(screen.getByText('Practicing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /end session/i })).toBeInTheDocument();
  });

  it('advances elapsed display as time passes', async () => {
    renderDashboard();
    await act(async () => {
      screen.getByRole('button', { name: /start practice/i }).click();
    });
    act(() => { vi.advanceTimersByTime(90_000); }); // 90 seconds
    expect(screen.getByText('01:30')).toBeInTheDocument();
  });

  it('opens overlay when End Session is clicked', async () => {
    renderDashboard();
    await act(async () => {
      screen.getByRole('button', { name: /start practice/i }).click();
    });
    act(() => { vi.advanceTimersByTime(60_000); });
    await act(async () => {
      screen.getByRole('button', { name: /end session/i }).click();
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save session/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /discard/i })).toBeInTheDocument();
  });

  it('calls sessionsApi.create with duration in minutes when overlay saved', async () => {
    renderDashboard();
    await act(async () => {
      screen.getByRole('button', { name: /start practice/i }).click();
    });
    act(() => { vi.advanceTimersByTime(90_000); }); // 90s → Math.round(1.5) = 2 minutes
    await act(async () => {
      screen.getByRole('button', { name: /end session/i }).click();
    });
    await act(async () => {
      screen.getByRole('button', { name: /save session/i }).click();
    });
    expect(sessionsApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ duration_minutes: 2 }),
    );
  });

  it('rounds short sessions up to 1 minute minimum', async () => {
    renderDashboard();
    await act(async () => {
      screen.getByRole('button', { name: /start practice/i }).click();
    });
    act(() => { vi.advanceTimersByTime(20_000); }); // 20s → Math.round(0.33) = 0 → max(1,0) = 1
    await act(async () => {
      screen.getByRole('button', { name: /end session/i }).click();
    });
    await act(async () => {
      screen.getByRole('button', { name: /save session/i }).click();
    });
    expect(sessionsApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ duration_minutes: 1 }),
    );
  });

  it('resets display to 00:00 and Ready state after discarding overlay', async () => {
    renderDashboard();
    await act(async () => {
      screen.getByRole('button', { name: /start practice/i }).click();
    });
    act(() => { vi.advanceTimersByTime(60_000); });
    await act(async () => {
      screen.getByRole('button', { name: /end session/i }).click();
    });
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /discard/i }));
    });
    expect(screen.getByText('00:00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start practice/i })).toBeInTheDocument();
  });

  it('shows Saved flash after saving overlay', async () => {
    renderDashboard();
    await act(async () => {
      screen.getByRole('button', { name: /start practice/i }).click();
    });
    act(() => { vi.advanceTimersByTime(60_000); });
    await act(async () => {
      screen.getByRole('button', { name: /end session/i }).click();
    });
    await act(async () => {
      screen.getByRole('button', { name: /save session/i }).click();
    });
    expect(screen.getByText(/saved/i)).toBeInTheDocument();
  });
});
