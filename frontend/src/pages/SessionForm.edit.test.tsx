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
  vi.clearAllMocks();
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
