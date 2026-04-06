import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { sessionsApi } from '../api/sessions';
import { songsApi } from '../api/songs';
import { techniquesApi } from '../api/techniques';
import type { Song, Technique } from '../api/types';
import LibraryPicker from '../components/LibraryPicker';
import './SessionForm.css';

async function syncAttachments(
  sessionId: number,
  originalIds: number[],
  selectedIds: number[],
  attach: (sessionId: number, itemId: number) => Promise<void>,
  detach: (sessionId: number, itemId: number) => Promise<void>
) {
  const toAttach = selectedIds.filter(id => !originalIds.includes(id));
  const toDetach = originalIds.filter(id => !selectedIds.includes(id));
  await Promise.all([
    ...toAttach.map(itemId => attach(sessionId, itemId)),
    ...toDetach.map(itemId => detach(sessionId, itemId)),
  ]);
}

export default function SessionForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    date: today,
    duration_minutes: '',
    notes: '',
    reference_url: '',
  });

  const [songs, setSongs] = useState<Song[]>([]);
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [selectedSongIds, setSelectedSongIds] = useState<number[]>([]);
  const [selectedTechniqueIds, setSelectedTechniqueIds] = useState<number[]>([]);
  const [originalSongIds, setOriginalSongIds] = useState<number[]>([]);
  const [originalTechniqueIds, setOriginalTechniqueIds] = useState<number[]>([]);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditing);

  useEffect(() => {
    loadLibrary();
    if (isEditing && id) loadSession(parseInt(id));
  }, [id]);

  async function loadLibrary() {
    const [songList, techList] = await Promise.all([
      songsApi.list(),
      techniquesApi.list(),
    ]);
    setSongs(songList);
    setTechniques(techList);
  }

  async function loadSession(sessionId: number) {
    try {
      const session = await sessionsApi.get(sessionId);
      setForm({
        date: session.date.slice(0, 10),
        duration_minutes: String(session.duration_minutes),
        notes: session.notes ?? '',
        reference_url: session.reference_url ?? '',
      });
      const songIds = (session.songs ?? []).map(s => s.id);
      const techIds = (session.techniques ?? []).map(t => t.id);
      setSelectedSongIds(songIds);
      setSelectedTechniqueIds(techIds);
      setOriginalSongIds(songIds);
      setOriginalTechniqueIds(techIds);
    } finally {
      setLoading(false);
    }
  }

  function toggleSong(songId: number) {
    setSelectedSongIds(ids =>
      ids.includes(songId) ? ids.filter(i => i !== songId) : [...ids, songId]
    );
  }

  function toggleTechnique(techId: number) {
    setSelectedTechniqueIds(ids =>
      ids.includes(techId) ? ids.filter(i => i !== techId) : [...ids, techId]
    );
  }

  async function handleCreateSong(title: string) {
    const song = await songsApi.create({ title });
    setSongs(prev => [...prev, song]);
    setSelectedSongIds(prev => [...prev, song.id]);
  }

  async function handleCreateTechnique(name: string) {
    const tech = await techniquesApi.create({ name });
    setTechniques(prev => [...prev, tech]);
    setSelectedTechniqueIds(prev => [...prev, tech.id]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const mins = parseInt(form.duration_minutes);
    if (!mins || mins < 1) return;

    setSaving(true);
    try {
      if (isEditing && id) {
        const session = await sessionsApi.update(parseInt(id), {
          date: form.date,
          duration_minutes: mins,
          notes: form.notes || undefined,
          reference_url: form.reference_url || undefined,
        });
        await syncAttachments(
          session.id, originalSongIds, selectedSongIds,
          sessionsApi.attachSong, sessionsApi.detachSong
        );
        await syncAttachments(
          session.id, originalTechniqueIds, selectedTechniqueIds,
          sessionsApi.attachTechnique, sessionsApi.detachTechnique
        );
      } else {
        const session = await sessionsApi.create({
          date: form.date,
          duration_minutes: mins,
          notes: form.notes || undefined,
          reference_url: form.reference_url || undefined,
        });
        await Promise.all([
          ...selectedSongIds.map(songId => sessionsApi.attachSong(session.id, songId)),
          ...selectedTechniqueIds.map(techId => sessionsApi.attachTechnique(session.id, techId)),
        ]);
      }
      navigate('/');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="form-loading">Loading…</div>;
  }

  return (
    <div className="session-form-page">
      <header className="form-header">
        <Link to="/" className="back-link">← Dashboard</Link>
        <h1 className="form-title">
          {isEditing ? 'Edit Session' : 'New Session'}
        </h1>
      </header>

      <form className="session-form" onSubmit={handleSubmit} noValidate>

        <div className="form-row-2">
          <div className="field">
            <label className="field-label" htmlFor="sf-date">Date</label>
            <input
              id="sf-date"
              type="date"
              className="field-input"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              required
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="sf-dur">Duration (min)</label>
            <input
              id="sf-dur"
              type="number"
              className="field-input"
              placeholder="45"
              min="1"
              value={form.duration_minutes}
              onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))}
              required
            />
          </div>
        </div>

        <LibraryPicker
          heading="Songs"
          items={songs.map(s => ({
            id: s.id,
            label: s.artist ? `${s.title} — ${s.artist}` : s.title,
          }))}
          selectedIds={selectedSongIds}
          onToggle={toggleSong}
          onCreate={handleCreateSong}
          createPlaceholder="Add a song…"
        />

        <LibraryPicker
          heading="Techniques"
          items={techniques.map(t => ({
            id: t.id,
            label: t.category ? `${t.name} (${t.category})` : t.name,
          }))}
          selectedIds={selectedTechniqueIds}
          onToggle={toggleTechnique}
          onCreate={handleCreateTechnique}
          createPlaceholder="Add a technique…"
        />

        <div className="field">
          <label className="field-label" htmlFor="sf-notes">Notes</label>
          <input
            id="sf-notes"
            type="text"
            className="field-input"
            placeholder="What did you work on?"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="sf-url">Reference URL</label>
          <input
            id="sf-url"
            type="url"
            className="field-input"
            placeholder="https://…"
            value={form.reference_url}
            onChange={e => setForm(f => ({ ...f, reference_url: e.target.value }))}
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="submit-btn" disabled={saving}>
            {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Log Session'}
          </button>
          <Link to="/" className="cancel-link">Cancel</Link>
        </div>

      </form>
    </div>
  );
}
