import { describe, expect, it } from 'vitest';
import { formatIsoDate, isIsoDate, parseIsoDate, toIsoDate } from './dates';

describe('IsoDate helpers', () => {
  it('сохраняет календарный день при round-trip', () => {
    for (const iso of ['2026-01-01', '2026-03-29', '2026-10-25', '2024-02-29', '2026-12-31']) {
      expect(toIsoDate(parseIsoDate(iso))).toBe(iso);
    }
  });

  it('берёт локальную дату, а не UTC', () => {
    expect(toIsoDate(new Date(2026, 0, 1, 0, 30))).toBe('2026-01-01');
    expect(toIsoDate(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
  });

  it('валидирует формат и существование дня', () => {
    expect(isIsoDate('2026-10-20')).toBe(true);
    expect(isIsoDate('2024-02-29')).toBe(true);
    expect(isIsoDate('2026-02-29')).toBe(false);
    expect(isIsoDate('2026-13-01')).toBe(false);
    expect(isIsoDate('20.10.2026')).toBe(false);
  });

  it('форматирует по-русски', () => {
    expect(formatIsoDate('2026-10-20')).toBe('20 октября 2026');
  });
});
