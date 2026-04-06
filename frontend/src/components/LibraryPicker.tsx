import { useState } from 'react';
import './LibraryPicker.css';

interface PickerItem {
  id: number;
  label: string;
}

interface LibraryPickerProps {
  heading: string;
  items: PickerItem[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  onCreate: (label: string) => Promise<void>;
  createPlaceholder: string;
}

export default function LibraryPicker({
  heading,
  items,
  selectedIds,
  onToggle,
  onCreate,
  createPlaceholder,
}: LibraryPickerProps) {
  const [newLabel, setNewLabel] = useState('');
  const [creating, setCreating] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const label = newLabel.trim();
    if (!label) return;
    setCreating(true);
    try {
      await onCreate(label);
      setNewLabel('');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="library-picker">
      <div className="picker-heading">{heading}</div>

      {items.length === 0 ? (
        <div className="picker-empty">Nothing in your library yet — add one below.</div>
      ) : (
        <div className="picker-chips">
          {items.map(item => {
            const active = selectedIds.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                className={`picker-chip${active ? ' chip-active' : ''}`}
                onClick={() => onToggle(item.id)}
              >
                {item.label}
                {active && <span className="chip-mark" aria-hidden>✦</span>}
              </button>
            );
          })}
        </div>
      )}

      <form className="picker-add-row" onSubmit={handleCreate}>
        <input
          type="text"
          className="picker-add-input"
          placeholder={createPlaceholder}
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          disabled={creating}
        />
        <button
          type="submit"
          className="picker-add-btn"
          disabled={!newLabel.trim() || creating}
          aria-label="Add"
        >
          {creating ? '…' : '+'}
        </button>
      </form>
    </div>
  );
}
