import { describe, expect, it } from 'vitest';
import type { Account, PlannedEntry } from '@/types/models';
import { forecastBreakdown } from './forecastView';

const audit = { createdAt: null, updatedAt: null };
const account: Account = {
  id: 'a',
  name: 'Карта',
  type: 'debit',
  openingBalanceMinor: 100_000_00,
  balanceAsOfDate: '2026-10-01',
  ...audit,
};
const entry = (
  id: string,
  date: string,
  amountMinor: number,
  type: PlannedEntry['type'],
): PlannedEntry => ({
  id,
  date,
  amountMinor,
  type,
  title: id,
  accountId: 'a',
  category: 'other',
  note: null,
  status: 'planned',
  ...audit,
});

describe('forecastBreakdown', () => {
  it('сходится: сейчас + поступления − траты = прогноз', () => {
    const plannedEntries = [
      entry('overdue', '2026-10-10', 1_000_00, 'expense'),
      entry('salary', '2026-10-25', 45_000_00, 'income'),
      entry('rent', '2026-10-30', 32_000_00, 'expense'),
    ];
    const b = forecastBreakdown(
      { accounts: [account], plannedEntries, rules: [], occurrences: [], transactions: [] },
      '2026-10-31',
      '2026-10-20',
    );
    expect(b.nowMinor + b.incomeMinor + b.expenseMinor).toBe(b.forecast.totalMinor);
    expect(b.overdueCount).toBe(1);
    expect(b.forecast.totalMinor).toBe(100_000_00 - 1_000_00 + 45_000_00 - 32_000_00);
  });
});
