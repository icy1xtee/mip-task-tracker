import { describe, expect, it } from 'vitest';
import { occurrenceDates } from './recurrence';

describe('occurrenceDates', () => {
  it('ежемесячно: 31-е число превращается в последний день короткого месяца', () => {
    const spec = {
      frequency: 'monthly' as const,
      startDate: '2026-01-31',
      endDate: null,
      dayOfMonth: 31,
    };
    expect(occurrenceDates(spec, '2026-01-01', '2026-05-31')).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
      '2026-05-31',
    ]);
  });

  it('ежемесячно: короткий месяц не «сдвигает» следующий', () => {
    const spec = {
      frequency: 'monthly' as const,
      startDate: '2024-01-30',
      endDate: null,
      dayOfMonth: 30,
    };
    expect(occurrenceDates(spec, '2024-02-01', '2024-03-31')).toEqual(['2024-02-29', '2024-03-30']);
  });

  it('генерирует только запрошенный диапазон, начиная не раньше startDate', () => {
    const spec = {
      frequency: 'monthly' as const,
      startDate: '2026-10-25',
      endDate: null,
      dayOfMonth: 25,
    };
    expect(occurrenceDates(spec, '2026-01-01', '2026-10-24')).toEqual([]);
    expect(occurrenceDates(spec, '2027-03-01', '2027-04-30')).toEqual(['2027-03-25', '2027-04-25']);
  });

  it('уважает endDate', () => {
    const spec = {
      frequency: 'monthly' as const,
      startDate: '2026-01-10',
      endDate: '2026-03-10',
      dayOfMonth: 10,
    };
    expect(occurrenceDates(spec, '2026-01-01', '2026-12-31')).toEqual([
      '2026-01-10',
      '2026-02-10',
      '2026-03-10',
    ]);
  });

  it('еженедельно — каждые 7 дней от даты начала', () => {
    const spec = {
      frequency: 'weekly' as const,
      startDate: '2026-10-02',
      endDate: null,
      dayOfMonth: null,
    };
    expect(occurrenceDates(spec, '2026-10-10', '2026-10-31')).toEqual([
      '2026-10-16',
      '2026-10-23',
      '2026-10-30',
    ]);
  });

  it('еженедельно через переход года', () => {
    const spec = {
      frequency: 'weekly' as const,
      startDate: '2026-12-24',
      endDate: null,
      dayOfMonth: null,
    };
    expect(occurrenceDates(spec, '2026-12-24', '2027-01-14')).toEqual([
      '2026-12-24',
      '2026-12-31',
      '2027-01-07',
      '2027-01-14',
    ]);
  });

  it('ежегодно: 29 февраля в невисокосный год — 28 февраля', () => {
    const spec = {
      frequency: 'yearly' as const,
      startDate: '2024-02-29',
      endDate: null,
      dayOfMonth: null,
    };
    expect(occurrenceDates(spec, '2024-01-01', '2028-12-31')).toEqual([
      '2024-02-29',
      '2025-02-28',
      '2026-02-28',
      '2027-02-28',
      '2028-02-29',
    ]);
  });

  it('не перебирает историю с начала для давних правил', () => {
    const spec = {
      frequency: 'monthly' as const,
      startDate: '1990-05-15',
      endDate: null,
      dayOfMonth: 15,
    };
    expect(occurrenceDates(spec, '2026-10-01', '2026-10-31')).toEqual(['2026-10-15']);
  });
});
