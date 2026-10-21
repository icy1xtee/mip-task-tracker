import { describe, expect, it } from 'vitest';
import type { Account, PlannedEntry } from '@/types/models';
import { overviewForecast, upcomingPayments } from './overviewView';

const audit = { createdAt: null, updatedAt: null };
const account: Account = {
  id: 'a',
  name: 'Карта',
  type: 'debit',
  openingBalanceMinor: 50_000_00,
  balanceAsOfDate: '2026-10-15',
  ...audit,
};
const entry = (
  id: string,
  date: string,
  amountMinor: number,
  status: PlannedEntry['status'] = 'planned',
): PlannedEntry => ({
  id,
  date,
  amountMinor,
  status,
  type: 'expense',
  title: id,
  accountId: 'a',
  category: 'other',
  note: null,
  ...audit,
});
const input = (plannedEntries: PlannedEntry[]) => ({
  accounts: [account],
  plannedEntries,
  rules: [],
  occurrences: [],
  transactions: [],
});

describe('overview', () => {
  it('прогноз — на ближайшую крупную операцию', () => {
    const f = overviewForecast(
      input([entry('small', '2026-10-22', 900_00), entry('rent', '2026-10-30', 32_000_00)]),
      '2026-10-20',
    );
    expect(f?.date).toBe('2026-10-30');
    expect(f?.totalMinor).toBe(50_000_00 - 900_00 - 32_000_00);
  });

  it('без крупных операций — конец месяца', () => {
    expect(
      overviewForecast(input([entry('small', '2026-10-22', 900_00)]), '2026-10-20')?.date,
    ).toBe('2026-10-31');
  });

  it('ближайшие платежи включают неотмеченные прошедшие, но не до фиксации баланса', () => {
    const items = upcomingPayments(
      input([
        entry('beforeSnapshot', '2026-10-10', 100_00),
        entry('overdue', '2026-10-18', 100_00),
        entry('paid', '2026-10-19', 100_00, 'completed'),
        entry('next', '2026-10-25', 100_00),
      ]),
      '2026-10-20',
    );
    expect(items.map((i) => i.sourceId)).toEqual(['overdue', 'next']);
  });
});
