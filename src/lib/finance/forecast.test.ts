import { describe, expect, it } from 'vitest';
import type {
  Account,
  PlannedEntry,
  RecurringOccurrence,
  RecurringRule,
  Transaction,
} from '@/types/models';
import { actualBalances, computeForecast, sumBalances } from './forecast';
import { expandPlan } from './plan';

const audit = { createdAt: null, updatedAt: null };

const debit: Account = {
  id: 'debit',
  name: 'Дебетовая',
  type: 'debit',
  openingBalanceMinor: 84_300_00,
  balanceAsOfDate: '2026-10-20',
  ...audit,
};
const credit: Account = {
  id: 'credit',
  name: 'Кредитка',
  type: 'credit',
  openingBalanceMinor: -18_450_00,
  balanceAsOfDate: '2026-10-20',
  ...audit,
};

function planned(
  p: Partial<PlannedEntry> & Pick<PlannedEntry, 'id' | 'date' | 'amountMinor' | 'type'>,
): PlannedEntry {
  return {
    title: p.id,
    accountId: 'debit',
    category: 'other',
    note: null,
    status: 'planned',
    ...audit,
    ...p,
  };
}

function tx(
  t: Partial<Transaction> & Pick<Transaction, 'id' | 'date' | 'amountMinor' | 'type'>,
): Transaction {
  return {
    accountId: 'debit',
    category: 'other',
    note: null,
    plannedEntryId: null,
    recurringOccurrenceId: null,
    ...audit,
    ...t,
  };
}

const utilities: RecurringRule = {
  id: 'util',
  title: 'Коммуналка',
  type: 'expense',
  amountMinor: 7_000_00,
  accountId: 'debit',
  category: 'housing',
  note: null,
  frequency: 'monthly',
  startDate: '2026-01-25',
  endDate: null,
  dayOfMonth: 25,
  ...audit,
};

const empty = { plannedEntries: [], rules: [], occurrences: [], transactions: [] };

describe('computeForecast', () => {
  it('начинает со снимка и считает нетто с учётом долга', () => {
    const f = computeForecast({ ...empty, accounts: [debit, credit] }, '2026-10-31');
    expect(f.totalMinor).toBe(84_300_00 - 18_450_00);
    expect(sumBalances(f.accounts)).toEqual({
      net: 65_850_00,
      assets: 84_300_00,
      debt: -18_450_00,
    });
  });

  it('учитывает фактические транзакции только после даты снимка', () => {
    const transactions = [
      tx({ id: 'before', date: '2026-10-19', amountMinor: 1_000_00, type: 'expense' }),
      tx({ id: 'onSnapshot', date: '2026-10-20', amountMinor: 1_000_00, type: 'expense' }),
      tx({ id: 'after', date: '2026-10-22', amountMinor: 500_00, type: 'expense' }),
      tx({ id: 'beyond', date: '2026-11-02', amountMinor: 9_000_00, type: 'expense' }),
    ];
    const f = computeForecast({ ...empty, transactions, accounts: [debit] }, '2026-10-31');
    expect(f.totalMinor).toBe(84_300_00 - 500_00);
    expect(f.transactions.map((t) => t.id)).toEqual(['after']);
  });

  it('добавляет плановые операции, не отмеченные выполненными или пропущенными', () => {
    const plannedEntries = [
      planned({ id: 'salary', date: '2026-10-25', amountMinor: 45_000_00, type: 'income' }),
      planned({
        id: 'skipped',
        date: '2026-10-26',
        amountMinor: 3_000_00,
        type: 'expense',
        status: 'skipped',
      }),
      planned({ id: 'later', date: '2026-11-05', amountMinor: 1_000_00, type: 'expense' }),
    ];
    const f = computeForecast({ ...empty, plannedEntries, accounts: [debit] }, '2026-10-31');
    expect(f.totalMinor).toBe(84_300_00 + 45_000_00);
    expect(f.pending.map((i) => i.sourceId)).toEqual(['salary']);
  });

  it('не учитывает выполненную плановую операцию дважды', () => {
    const plannedEntries = [
      planned({
        id: 'gift',
        date: '2026-10-26',
        amountMinor: 3_000_00,
        type: 'expense',
        status: 'completed',
      }),
    ];
    const transactions = [
      tx({
        id: 'paid',
        date: '2026-10-24',
        amountMinor: 3_000_00,
        type: 'expense',
        plannedEntryId: 'gift',
      }),
    ];
    const f = computeForecast(
      { ...empty, plannedEntries, transactions, accounts: [debit] },
      '2026-10-31',
    );
    expect(f.totalMinor).toBe(84_300_00 - 3_000_00);
    expect(f.pending).toEqual([]);
  });

  it('генерирует регулярные экземпляры только в диапазоне и пропускает оплаченные и пропущенные', () => {
    const occurrences: RecurringOccurrence[] = [
      {
        id: 'util_2026-11-25',
        ruleId: 'util',
        date: '2026-11-25',
        status: 'completed',
        actualTransactionId: 'nov',
        ...audit,
      },
      {
        id: 'util_2026-12-25',
        ruleId: 'util',
        date: '2026-12-25',
        status: 'skipped',
        actualTransactionId: null,
        ...audit,
      },
    ];
    const transactions = [
      tx({
        id: 'nov',
        date: '2026-11-24',
        amountMinor: 7_000_00,
        type: 'expense',
        recurringOccurrenceId: 'util_2026-11-25',
      }),
    ];
    const f = computeForecast(
      { ...empty, rules: [utilities], occurrences, transactions, accounts: [debit] },
      '2027-01-31',
    );
    // окт (planned) + ноя (факт) + дек (пропуск) + янв (planned) = 3 списания по 7 000
    expect(f.totalMinor).toBe(84_300_00 - 3 * 7_000_00);
    expect(f.pending.map((i) => i.date)).toEqual(['2026-10-25', '2027-01-25']);
  });

  it('не выдумывает баланс раньше даты фиксации', () => {
    const f = computeForecast(
      { ...empty, accounts: [debit, { ...credit, balanceAsOfDate: '2026-11-01' }] },
      '2026-10-25',
    );
    expect(f.accounts.find((a) => a.account.id === 'credit')?.available).toBe(false);
    expect(f.totalMinor).toBe(84_300_00);
  });

  it('плановые операции счёта до его снимка уже отражены в остатке', () => {
    const plannedEntries = [
      planned({ id: 'old', date: '2026-10-10', amountMinor: 900_00, type: 'expense' }),
    ];
    const f = computeForecast({ ...empty, plannedEntries, accounts: [debit] }, '2026-10-31');
    expect(f.totalMinor).toBe(84_300_00);
  });
});

describe('actualBalances', () => {
  it('не включает план — только снимок и факт', () => {
    const transactions = [tx({ id: 't', date: '2026-10-21', amountMinor: 200_00, type: 'income' })];
    const [b] = actualBalances([debit], transactions, '2026-10-21');
    expect(b?.balanceMinor).toBe(84_300_00 + 200_00);
  });
});

describe('expandPlan', () => {
  it('связывает выполненную разовую операцию с её транзакцией', () => {
    const plannedEntries = [
      planned({
        id: 'gift',
        date: '2026-10-26',
        amountMinor: 3_000_00,
        type: 'expense',
        status: 'completed',
      }),
    ];
    const transactions = [
      tx({
        id: 'paid',
        date: '2026-10-26',
        amountMinor: 3_000_00,
        type: 'expense',
        plannedEntryId: 'gift',
      }),
    ];
    const [item] = expandPlan(
      { ...empty, plannedEntries, transactions },
      '2026-10-01',
      '2026-10-31',
    );
    expect(item?.transactionId).toBe('paid');
  });
});
