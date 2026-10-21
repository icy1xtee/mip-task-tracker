import { describe, expect, it } from 'vitest';
import type { Transaction } from '@/types/models';
import { summarizeMonth } from './monthSummary';

const t = (
  id: string,
  date: string,
  amountMinor: number,
  category = 'groceries',
  type: Transaction['type'] = 'expense',
): Transaction => ({
  id,
  date,
  amountMinor,
  category,
  type,
  accountId: 'a',
  note: null,
  plannedEntryId: null,
  recurringOccurrenceId: null,
  createdAt: null,
  updatedAt: null,
});

describe('summarizeMonth', () => {
  const list = [
    t('s1', '2026-09-05', 10_000_00),
    t('s2', '2026-09-25', 5_000_00, 'leisure'),
    t('o1', '2026-10-03', 12_000_00),
    t('o2', '2026-10-21', 3_000_00),
    t('inc', '2026-10-05', 95_000_00, 'income', 'income'),
  ];

  it('текущий месяц: до сегодня и тот же период прошлого', () => {
    const s = summarizeMonth(list, '2026-10', '2026-10-20');
    expect(s.totalMinor).toBe(12_000_00);
    expect(s.previousMinor).toBe(10_000_00);
    expect(s.previousChange).toBe(20);
    expect(s.projectionMinor).toBe(18_600_00);
    expect(s.months.map((m) => m.month)).toEqual(['2026-09', '2026-10']);
    expect(s.averageMinor).toBe(15_000_00);
  });

  it('прошлый месяц — целиком, без прогноза темпа', () => {
    const s = summarizeMonth(list, '2026-09', '2026-10-20');
    expect(s.totalMinor).toBe(15_000_00);
    expect(s.projectionMinor).toBeNull();
    expect(s.previousMinor).toBeNull();
  });

  it('без истории не выдумывает сравнение', () => {
    const s = summarizeMonth([t('o1', '2026-10-03', 1_000_00)], '2026-10', '2026-10-20');
    expect(s.previousMinor).toBeNull();
    expect(s.averageMinor).toBeNull();
    expect(s.months).toHaveLength(1);
  });
});
