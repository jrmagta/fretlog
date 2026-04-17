import { useState, useRef } from 'react';
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
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmed = query.trim();

  const selectedItems = items.filter(i => selectedIds.includes(i.id));
  const unselectedItems = items.filter(i => !selectedIds.includes(i.id));

  const filtered = trimmed
    ? unselectedItems.filter(i => i.label.toLowerCase().includes(trimmed.toLowerCase()))
    : unselectedItems;

  const exactMatch = trimmed
    ? items.some(i => i.label.toLowerCase() === trimmed.toLowerCase())
    : false;

  const showAddOption = trimmed.length > 0 && !exactMatch;
  const showDropdown = open && (filtered.length > 0 || showAddOption);

  function handleSelect(id: number) {
    onToggle(id);
    setQuery('');
    inputRef.current?.focus();
  }

  async function handleCreate() {
    if (!trimmed || creating) return;
    setCreating(true);
    try {
      await onCreate(trimmed);
      setQuery('');
      inputRef.current?.focus();
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="library-picker">
      <div className="picker-heading">{heading}</div>

      {selectedItems.length > 0 && (
        <div className="picker-tags">
          {selectedItems.map(item => (
            <button
              key={item.id}
              type="button"
              className="picker-tag"
              onClick={() => onToggle(item.id)}
              aria-label={`Remove ${item.label}`}
            >
              {item.label}
              <span className="picker-tag-remove" aria-hidden>×</span>
            </button>
          ))}
        </div>
      )}

      <div className="picker-combobox">
        <input
          ref={inputRef}
          type="text"
          className="picker-input"
          placeholder={createPlaceholder}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          disabled={creating}
          autoComplete="off"
        />

        {showDropdown && (
          <ul className="picker-dropdown" role="listbox">
            {filtered.map(item => (
              <li
                key={item.id}
                role="option"
                aria-selected={false}
                className="picker-option"
                onMouseDown={e => e.preventDefault()}
                onClick={() => handleSelect(item.id)}
              >
                {item.label}
              </li>
            ))}
            {showAddOption && (
              <li
                role="option"
                aria-selected={false}
                className="picker-option picker-option-create"
                onMouseDown={e => e.preventDefault()}
                onClick={handleCreate}
              >
                {creating ? 'Adding…' : <>Add <strong>"{trimmed}"</strong></>}
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
