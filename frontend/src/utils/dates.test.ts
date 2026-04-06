import { describe, it, expect } from 'vitest';
import { parseDateStrip, formatMinutes, formatElapsed } from './dates';

describe('parseDateStrip', () => {
  it('parses a plain YYYY-MM-DD string', () => {
    const result = parseDateStrip('2026-04-06');
    expect(result.month).toBe('APR');
    expect(result.day).toBe('6');
  });

  it('parses a full ISO datetime string without mangling the day', () => {
    const result = parseDateStrip('2026-04-06T00:00:00.000Z');
    expect(result.month).toBe('APR');
    expect(result.day).toBe('6');
  });

  it('handles single-digit day correctly', () => {
    const result = parseDateStrip('2026-01-03');
    expect(result.month).toBe('JAN');
    expect(result.day).toBe('3');
  });

  it('handles December correctly', () => {
    const result = parseDateStrip('2026-12-31');
    expect(result.month).toBe('DEC');
    expect(result.day).toBe('31');
  });
});

describe('formatMinutes', () => {
  it('returns 0m for zero', () => {
    expect(formatMinutes(0)).toBe('0m');
  });

  it('returns minutes only when under 60', () => {
    expect(formatMinutes(45)).toBe('45m');
    expect(formatMinutes(59)).toBe('59m');
  });

  it('returns hours only when no remainder', () => {
    expect(formatMinutes(60)).toBe('1h');
    expect(formatMinutes(120)).toBe('2h');
  });

  it('returns hours and minutes when there is a remainder', () => {
    expect(formatMinutes(90)).toBe('1h 30m');
    expect(formatMinutes(340)).toBe('5h 40m');
  });
});

describe('formatElapsed', () => {
  it('formats zero as 00:00', () => {
    expect(formatElapsed(0)).toBe('00:00');
  });

  it('pads single digit minutes and seconds', () => {
    expect(formatElapsed(65)).toBe('01:05');
  });

  it('formats large values correctly', () => {
    expect(formatElapsed(3661)).toBe('61:01');
  });
});
