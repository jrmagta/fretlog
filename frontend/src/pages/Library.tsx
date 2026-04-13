import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { songsApi } from '../api/songs';
import { techniquesApi } from '../api/techniques';
import './Library.css';

// ── Config ────────────────────────────────────────────────────────────────────

type LibraryType = 'songs' | 'techniques';

const CONFIG = {
  songs: {
    title: 'Songs',
    singular: 'song',
    primaryLabel: 'Title',
    primaryPlaceholder: 'Song title',
    secondaryLabel: 'Artist',
    secondaryPlaceholder: 'Artist name',
    otherPath: '/techniques',
    otherLabel: 'Techniques',
  },
  techniques: {
    title: 'Techniques',
    singular: 'technique',
    primaryLabel: 'Name',
    primaryPlaceholder: 'Technique name',
    secondaryLabel: 'Category',
    secondaryPlaceholder: 'e.g. Picking, Fretting…',
    otherPath: '/songs',
    otherLabel: 'Songs',
  },
} as const;

// ── Normalised item ───────────────────────────────────────────────────────────

interface LibraryItem {
  id: number;
  primary: string;
  secondary: string | null;
  reference_url: string | null;
}

interface FormState {
  primary: string;
  secondary: string;
  reference_url: string;
}

const emptyForm: FormState = { primary: '', secondary: '', reference_url: '' };

// ── API helpers ───────────────────────────────────────────────────────────────

async function fetchItems(type: LibraryType): Promise<LibraryItem[]> {
  if (type === 'songs') {
    const songs = await songsApi.list();
    return songs
      .map(s => ({ id: s.id, primary: s.title, secondary: s.artist, reference_url: s.reference_url }))
      .sort((a, b) => a.primary.localeCompare(b.primary));
  } else {
    const techs = await techniquesApi.list();
    return techs
      .map(t => ({ id: t.id, primary: t.name, secondary: t.category, reference_url: t.reference_url }))
      .sort((a, b) => a.primary.localeCompare(b.primary));
  }
}

async function createItem(type: LibraryType, form: FormState): Promise<LibraryItem> {
  if (type === 'songs') {
    const s = await songsApi.create({
      title: form.primary.trim(),
      artist: form.secondary.trim() || undefined,
      reference_url: form.reference_url.trim() || undefined,
    });
    return { id: s.id, primary: s.title, secondary: s.artist, reference_url: s.reference_url };
  } else {
    const t = await techniquesApi.create({
      name: form.primary.trim(),
      category: form.secondary.trim() || undefined,
      reference_url: form.reference_url.trim() || undefined,
    });
    return { id: t.id, primary: t.name, secondary: t.category, reference_url: t.reference_url };
  }
}

async function updateItem(type: LibraryType, id: number, form: FormState): Promise<LibraryItem> {
  if (type === 'songs') {
    const s = await songsApi.update(id, {
      title: form.primary.trim(),
      artist: form.secondary.trim() || undefined,
      reference_url: form.reference_url.trim() || undefined,
    });
    return { id: s.id, primary: s.title, secondary: s.artist, reference_url: s.reference_url };
  } else {
    const t = await techniquesApi.update(id, {
      name: form.primary.trim(),
      category: form.secondary.trim() || undefined,
      reference_url: form.reference_url.trim() || undefined,
    });
    return { id: t.id, primary: t.name, secondary: t.category, reference_url: t.reference_url };
  }
}

async function deleteItem(type: LibraryType, id: number): Promise<void> {
  if (type === 'songs') return songsApi.delete(id);
  else return techniquesApi.delete(id);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Library({ type }: { type: LibraryType }) {
  const libraryType = type;
  const config = CONFIG[libraryType];

  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<FormState>(emptyForm);
  const [adding, setAdding] = useState(false);

  // Edit
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Delete
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setLoading(true);
    setEditId(null);
    setConfirmDeleteId(null);
    setShowAdd(false);
    fetchItems(libraryType).then(setItems).finally(() => setLoading(false));
  }, [libraryType]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.primary.trim()) return;
    setAdding(true);
    try {
      const item = await createItem(libraryType, addForm);
      setItems(prev => [...prev, item].sort((a, b) => a.primary.localeCompare(b.primary)));
      setAddForm(emptyForm);
      setShowAdd(false);
    } finally {
      setAdding(false);
    }
  }

  function startEdit(item: LibraryItem) {
    setConfirmDeleteId(null);
    setEditId(item.id);
    setEditForm({
      primary: item.primary,
      secondary: item.secondary ?? '',
      reference_url: item.reference_url ?? '',
    });
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId || !editForm.primary.trim()) return;
    setSaving(true);
    try {
      const updated = await updateItem(libraryType, editId, editForm);
      setItems(prev =>
        prev.map(i => i.id === editId ? updated : i)
            .sort((a, b) => a.primary.localeCompare(b.primary))
      );
      setEditId(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    setDeleting(true);
    try {
      await deleteItem(libraryType, id);
      setItems(prev => prev.filter(i => i.id !== id));
      setConfirmDeleteId(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="library-page">

      <header className="library-header">
        <Link to="/" className="history-wordmark">
          <span className="wordmark-accent">F</span>RETLOG
        </Link>
        <nav className="library-nav">
          <Link to="/sessions" className="library-nav-link">History</Link>
          <Link to={config.otherPath} className="library-nav-link">{config.otherLabel}</Link>
        </nav>
      </header>

      <div className="library-content">

        <div className="library-title-row">
          <h1 className="history-title">{config.title}</h1>
          <div className="library-title-actions">
            {!loading && (
              <span className="history-count">{items.length} {items.length === 1 ? config.singular : config.title.toLowerCase()}</span>
            )}
            <button
              className={`library-add-toggle${showAdd ? ' is-cancel' : ''}`}
              onClick={() => { setShowAdd(v => !v); setAddForm(emptyForm); }}
            >
              {showAdd ? 'Cancel' : `+ Add ${config.singular}`}
            </button>
          </div>
        </div>

        {/* ── Add form ── */}
        {showAdd && (
          <form className="library-add-form" onSubmit={handleAdd}>
            <div className="library-form-fields">
              <div className="field">
                <label className="field-label">{config.primaryLabel}</label>
                <input
                  className="field-input"
                  type="text"
                  placeholder={config.primaryPlaceholder}
                  value={addForm.primary}
                  onChange={e => setAddForm(f => ({ ...f, primary: e.target.value }))}
                  required
                  autoFocus
                />
              </div>
              <div className="field">
                <label className="field-label">{config.secondaryLabel}</label>
                <input
                  className="field-input"
                  type="text"
                  placeholder={config.secondaryPlaceholder}
                  value={addForm.secondary}
                  onChange={e => setAddForm(f => ({ ...f, secondary: e.target.value }))}
                />
              </div>
              <div className="field">
                <label className="field-label">Reference URL</label>
                <input
                  className="field-input"
                  type="url"
                  placeholder="https://…"
                  value={addForm.reference_url}
                  onChange={e => setAddForm(f => ({ ...f, reference_url: e.target.value }))}
                />
              </div>
            </div>
            <div className="library-form-actions">
              <button type="submit" className="submit-btn" disabled={adding || !addForm.primary.trim()}>
                {adding ? 'Adding…' : `Add ${config.singular}`}
              </button>
            </div>
          </form>
        )}

        {/* ── List ── */}
        {loading && <div className="sessions-empty">Loading…</div>}

        {!loading && items.length === 0 && (
          <div className="sessions-empty">
            No {config.title.toLowerCase()} yet — add your first one above.
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="library-list">
            {items.map((item, i) => (
              <article
                key={item.id}
                className={`library-row${editId === item.id ? ' library-row-editing' : ''}`}
                style={{ animationDelay: `${i * 0.03}s` }}
              >
                {editId === item.id ? (
                  /* ── Edit row ── */
                  <form className="library-edit-form" onSubmit={handleSaveEdit}>
                    <div className="library-form-fields">
                      <div className="field">
                        <label className="field-label">{config.primaryLabel}</label>
                        <input
                          className="field-input"
                          type="text"
                          value={editForm.primary}
                          onChange={e => setEditForm(f => ({ ...f, primary: e.target.value }))}
                          required
                          autoFocus
                        />
                      </div>
                      <div className="field">
                        <label className="field-label">{config.secondaryLabel}</label>
                        <input
                          className="field-input"
                          type="text"
                          placeholder={config.secondaryPlaceholder}
                          value={editForm.secondary}
                          onChange={e => setEditForm(f => ({ ...f, secondary: e.target.value }))}
                        />
                      </div>
                      <div className="field">
                        <label className="field-label">Reference URL</label>
                        <input
                          className="field-input"
                          type="url"
                          placeholder="https://…"
                          value={editForm.reference_url}
                          onChange={e => setEditForm(f => ({ ...f, reference_url: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="library-form-actions">
                      <button type="submit" className="submit-btn" disabled={saving || !editForm.primary.trim()}>
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                      <button type="button" className="cancel-link" onClick={() => setEditId(null)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  /* ── Display row ── */
                  <>
                    <div className="library-row-main">
                      <div className="library-row-body">
                        <span className="library-primary">{item.primary}</span>
                        {item.secondary && (
                          <span className="library-secondary">{item.secondary}</span>
                        )}
                        {item.reference_url && (
                          <a
                            href={item.reference_url}
                            className="session-ref-link"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            reference ↗
                          </a>
                        )}
                      </div>
                      <div className="history-actions">
                        <button
                          className="history-action-link"
                          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                          onClick={() => startEdit(item)}
                        >
                          Edit
                        </button>
                        <button
                          className="history-delete-btn"
                          onClick={() => setConfirmDeleteId(confirmDeleteId === item.id ? null : item.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {confirmDeleteId === item.id && (
                      <div className="history-confirm">
                        <span className="history-confirm-text">
                          Delete "{item.primary}"? Sessions using it won't be affected.
                        </span>
                        <button
                          className="history-confirm-yes"
                          onClick={() => handleDelete(item.id)}
                          disabled={deleting}
                        >
                          {deleting ? 'Deleting…' : 'Yes, delete'}
                        </button>
                        <button
                          className="history-confirm-cancel"
                          onClick={() => setConfirmDeleteId(null)}
                          disabled={deleting}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </>
                )}
              </article>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
