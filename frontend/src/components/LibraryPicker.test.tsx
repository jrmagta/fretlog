import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LibraryPicker from './LibraryPicker';

const baseProps = {
  heading: 'Songs',
  items: [] as { id: number; label: string }[],
  selectedIds: [] as number[],
  onToggle: vi.fn(),
  onCreate: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  createPlaceholder: 'Add a song…',
};

beforeEach(() => {
  vi.clearAllMocks();
  baseProps.onCreate.mockResolvedValue(undefined);
});

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('rendering', () => {
  it('shows the heading', () => {
    render(<LibraryPicker {...baseProps} />);
    expect(screen.getByText('Songs')).toBeInTheDocument();
  });

  it('shows the text input with placeholder', () => {
    render(<LibraryPicker {...baseProps} />);
    expect(screen.getByPlaceholderText('Add a song…')).toBeInTheDocument();
  });

  it('shows unselected items as options in dropdown when input is focused', async () => {
    render(<LibraryPicker {...baseProps} items={[{ id: 1, label: 'Blackbird' }, { id: 2, label: 'Yesterday' }]} />);
    await userEvent.click(screen.getByPlaceholderText('Add a song…'));
    expect(screen.getByRole('option', { name: 'Blackbird' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Yesterday' })).toBeInTheDocument();
  });

  it('selected items appear as removable tags above the input', () => {
    render(<LibraryPicker {...baseProps} items={[{ id: 1, label: 'Blackbird' }]} selectedIds={[1]} />);
    expect(screen.getByRole('button', { name: 'Remove Blackbird' })).toBeInTheDocument();
  });

  it('unselected items do not appear as tags', () => {
    render(<LibraryPicker {...baseProps} items={[{ id: 1, label: 'Blackbird' }]} selectedIds={[]} />);
    expect(screen.queryByRole('button', { name: 'Remove Blackbird' })).not.toBeInTheDocument();
  });

  it('selected items are excluded from the dropdown', async () => {
    render(<LibraryPicker {...baseProps} items={[{ id: 1, label: 'Blackbird' }]} selectedIds={[1]} />);
    await userEvent.click(screen.getByPlaceholderText('Add a song…'));
    expect(screen.queryByRole('option', { name: 'Blackbird' })).not.toBeInTheDocument();
  });
});

// ── Selection ─────────────────────────────────────────────────────────────────

describe('selection', () => {
  it('selecting from dropdown calls onToggle with the item id', async () => {
    const onToggle = vi.fn();
    render(<LibraryPicker {...baseProps} items={[{ id: 1, label: 'Blackbird' }]} onToggle={onToggle} />);
    await userEvent.click(screen.getByPlaceholderText('Add a song…'));
    await userEvent.click(screen.getByRole('option', { name: 'Blackbird' }));
    expect(onToggle).toHaveBeenCalledOnce();
    expect(onToggle).toHaveBeenCalledWith(1);
  });

  it('clicking a tag remove button calls onToggle with the item id', async () => {
    const onToggle = vi.fn();
    render(<LibraryPicker {...baseProps} items={[{ id: 1, label: 'Blackbird' }]} selectedIds={[1]} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('button', { name: 'Remove Blackbird' }));
    expect(onToggle).toHaveBeenCalledWith(1);
  });

  it('filters dropdown options by the typed query', async () => {
    render(<LibraryPicker {...baseProps} items={[
      { id: 1, label: 'Blackbird' },
      { id: 2, label: 'Yesterday' },
    ]} />);
    await userEvent.type(screen.getByPlaceholderText('Add a song…'), 'Black');
    expect(screen.getByRole('option', { name: 'Blackbird' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Yesterday' })).not.toBeInTheDocument();
  });
});

// ── Inline creation ───────────────────────────────────────────────────────────

describe('inline creation', () => {
  it('does not show add option when input is empty', async () => {
    render(<LibraryPicker {...baseProps} />);
    await userEvent.click(screen.getByPlaceholderText('Add a song…'));
    expect(screen.queryByRole('option', { name: /add/i })).not.toBeInTheDocument();
  });

  it('does not show add option when input is whitespace only', async () => {
    render(<LibraryPicker {...baseProps} />);
    await userEvent.type(screen.getByPlaceholderText('Add a song…'), '   ');
    expect(screen.queryByRole('option', { name: /add/i })).not.toBeInTheDocument();
  });

  it('does not show add option when query exactly matches an existing item', async () => {
    render(<LibraryPicker {...baseProps} items={[{ id: 1, label: 'Blackbird' }]} />);
    await userEvent.type(screen.getByPlaceholderText('Add a song…'), 'Blackbird');
    expect(screen.queryByRole('option', { name: /add/i })).not.toBeInTheDocument();
  });

  it('shows add option when query does not match any item', async () => {
    render(<LibraryPicker {...baseProps} items={[{ id: 1, label: 'Blackbird' }]} />);
    await userEvent.type(screen.getByPlaceholderText('Add a song…'), 'Yesterday');
    expect(screen.getByRole('option', { name: /add.*yesterday/i })).toBeInTheDocument();
  });

  it('calls onCreate with the trimmed label when add option is clicked', async () => {
    const onCreate = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    render(<LibraryPicker {...baseProps} onCreate={onCreate} />);
    await userEvent.type(screen.getByPlaceholderText('Add a song…'), ' Blackbird ');
    await userEvent.click(screen.getByRole('option', { name: /add.*blackbird/i }));
    expect(onCreate).toHaveBeenCalledOnce();
    expect(onCreate).toHaveBeenCalledWith('Blackbird');
  });

  it('clears the input after successful creation', async () => {
    const onCreate = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    render(<LibraryPicker {...baseProps} onCreate={onCreate} />);
    const input = screen.getByPlaceholderText('Add a song…');
    await userEvent.type(input, 'Blackbird');
    await userEvent.click(screen.getByRole('option', { name: /add.*blackbird/i }));
    expect(input).toHaveValue('');
  });

  it('shows "Adding…" and disables input while onCreate is in-flight', async () => {
    let resolveCreate!: () => void;
    const onCreate = vi.fn().mockReturnValue(new Promise<void>(r => { resolveCreate = r; }));
    render(<LibraryPicker {...baseProps} onCreate={onCreate} />);
    await userEvent.type(screen.getByPlaceholderText('Add a song…'), 'Blackbird');

    // Don't await — inspect in-flight state
    userEvent.click(screen.getByRole('option', { name: /add.*blackbird/i }));

    await screen.findByText('Adding…');
    expect(screen.getByPlaceholderText('Add a song…')).toBeDisabled();

    // Clean up
    resolveCreate();
  });
});
