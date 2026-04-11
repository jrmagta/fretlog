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
