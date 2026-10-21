import { describe, expect, it } from 'vitest';
import type { Transaction } from '@/types/models';
import { byCategory, expenses, monthWindow, percentChange, totalInRange } from './analytics';

const audit = { createdAt: null, updatedAt: null };
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
  ...audit,
});

const list = [
  t('1', '2026-09-03', 1_000_00),
  t('2', '2026-09-25', 2_000_00, 'leisure'),
  t('3', '2026-10-02', 3_000_00),
  t('4', '2026-10-15', 500_00, 'leisure'),
  t('5', '2026-10-15', 90_000_00, 'income', 'income'),
];

describe('analytics', () => {
  it('учитывает только расходы', () => {
    expect(expenses(list)).toHaveLength(4);
    expect(totalInRange(expenses(list), '2026-10-01', '2026-10-31')).toBe(3_500_00);
  });

  it('группирует по категориям в диапазоне', () => {
    const map = byCategory(expenses(list), '2026-10-01', '2026-10-31');
    expect(Object.fromEntries(map)).toEqual({ groceries: 3_000_00, leisure: 500_00 });
  });

  it('не показывает месяцы до первой траты', () => {
    expect(monthWindow(expenses(list), '2026-10', 6)).toEqual(['2026-09', '2026-10']);
    expect(monthWindow([], '2026-10', 6)).toEqual([]);
  });

  it('сравнение недоступно без базы', () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(100, 0)).toBeNull();
  });
});
