import { describe, expect, it } from 'vitest';
import {
  addDaysIso,
  addMonthsIso,
  diffDays,
  formatAgo,
  formatDayMonth,
  formatDayMonthShort,
  formatMonthYear,
  formatWeekdayDayMonth,
  isIsoDate,
  monthEnd,
  parseIsoDate,
  toIsoDate,
  weekdayIndex,
} from './dates';

const TODAY = '2026-10-20';

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

  it('считает дни и месяцы через границы', () => {
    expect(addDaysIso('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDaysIso('2026-03-28', 2)).toBe('2026-03-30');
    expect(diffDays('2026-10-20', '2026-10-18')).toBe(-2);
    expect(addMonthsIso('2026-12', 1)).toBe('2027-01');
    expect(addMonthsIso('2026-01', -1)).toBe('2025-12');
    expect(monthEnd('2024-02')).toBe('2024-02-29');
    expect(monthEnd('2026-02')).toBe('2026-02-28');
  });

  it('понедельник — первый день недели', () => {
    expect(weekdayIndex('2026-10-19')).toBe(0);
    expect(weekdayIndex('2026-10-25')).toBe(6);
  });

  it('форматирует по-русски, год — только если не текущий', () => {
    expect(formatDayMonth('2026-10-25', TODAY)).toBe('25 октября');
    expect(formatDayMonthShort('2026-10-25', TODAY)).toBe('25 окт');
    expect(formatDayMonthShort('2027-01-05', TODAY)).toBe('5 янв 2027');
    expect(formatWeekdayDayMonth('2026-10-20', TODAY)).toBe('Вторник, 20 октября');
    expect(formatMonthYear('2026-10')).toBe('Октябрь 2026');
  });
});

describe('formatAgo', () => {
  it.each([
    ['2026-10-20', 'сегодня'],
    ['2026-10-19', 'вчера'],
    ['2026-10-15', '5 дней назад'],
    ['2026-10-12', 'неделю назад'],
    ['2026-09-28', '3 недели назад'],
    ['2026-09-20', 'месяц назад'],
    ['2026-06-14', '4 месяца назад'],
    ['2025-10-20', 'год назад'],
    ['2021-01-01', '5 лет назад'],
  ])('%s → %s', (date, expected) => {
    expect(formatAgo(date, TODAY)).toBe(expected);
  });
});
