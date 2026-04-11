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
  vi.clearAllMocks();
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
