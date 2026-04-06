export function parseDateStrip(dateStr: string): { month: string; day: string } {
  // Slice to YYYY-MM-DD regardless of whether the API returns a full ISO string
  const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return {
    month: date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase(),
    day: String(day),
  };
}

export function formatMinutes(mins: number): string {
  if (mins === 0) return '0m';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function formatElapsed(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
