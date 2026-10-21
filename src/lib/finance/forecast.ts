import { addDaysIso, type IsoDate } from '@/lib/format/dates';
import type { Account, Transaction } from '@/types/models';
import { expandPlan, signedAmount, type PlanData, type PlanItem } from './plan';

/**
 * Прогноз баланса на конец выбранного дня (раздел 5.3 ТЗ).
 *
 * Для каждого счёта:
 *   openingBalance на конец balanceAsOfDate
 *   + фактические транзакции с датой в (balanceAsOfDate, date]
 *   + плановые операции и экземпляры регулярных правил со статусом planned в (balanceAsOfDate, date].
 *
 * Выполненные плановые записи не учитываются: вместо них считается связанная фактическая
 * транзакция — так одна оплата не попадает в прогноз дважды. Пропущенные не учитываются вовсе.
 * Если дата раньше фиксации баланса счёта, прогноз по нему недоступен — историю не выдумываем.
 */

export type AccountForecast = {
  account: Account;
  available: boolean;
  balanceMinor: number;
};

export type Forecast = {
  date: IsoDate;
  accounts: AccountForecast[];
  /** Нетто по доступным счетам: деньги минус долги. */
  totalMinor: number;
  /** Фактические транзакции, вошедшие в расчёт. */
  transactions: Transaction[];
  /** Неоплаченные плановые элементы, вошедшие в расчёт. */
  pending: PlanItem[];
};

export type ForecastInput = PlanData & { accounts: Account[] };

export function computeForecast(input: ForecastInput, date: IsoDate): Forecast {
  const available = input.accounts.filter((a) => a.balanceAsOfDate <= date);
  const asOf = new Map(available.map((a) => [a.id, a.balanceAsOfDate]));
  const earliest = available.reduce<IsoDate | null>(
    (min, a) => (min === null || a.balanceAsOfDate < min ? a.balanceAsOfDate : min),
    null,
  );

  const isAfterSnapshot = (accountId: string, d: IsoDate) => {
    const snapshot = asOf.get(accountId);
    return snapshot !== undefined && d > snapshot && d <= date;
  };

  const transactions = input.transactions.filter((t) => isAfterSnapshot(t.accountId, t.date));
  const pending =
    earliest === null
      ? []
      : expandPlan(input, addDaysIso(earliest, 1), date).filter(
          (i) => i.status === 'planned' && isAfterSnapshot(i.accountId, i.date),
        );

  const balance = new Map(available.map((a) => [a.id, a.openingBalanceMinor]));
  for (const t of transactions)
    balance.set(t.accountId, (balance.get(t.accountId) ?? 0) + signedAmount(t));
  for (const i of pending)
    balance.set(i.accountId, (balance.get(i.accountId) ?? 0) + signedAmount(i));

  const accounts = input.accounts.map((account) => ({
    account,
    available: asOf.has(account.id),
    balanceMinor: balance.get(account.id) ?? account.openingBalanceMinor,
  }));

  return {
    date,
    accounts,
    totalMinor: accounts.filter((a) => a.available).reduce((s, a) => s + a.balanceMinor, 0),
    transactions,
    pending,
  };
}

/** Фактический баланс на конец дня — только снимок и фактические транзакции, без плана. */
export function actualBalances(
  accounts: Account[],
  transactions: Transaction[],
  date: IsoDate,
): AccountForecast[] {
  return accounts.map((account) => {
    if (account.balanceAsOfDate > date) {
      return { account, available: false, balanceMinor: account.openingBalanceMinor };
    }
    const delta = transactions
      .filter(
        (t) => t.accountId === account.id && t.date > account.balanceAsOfDate && t.date <= date,
      )
      .reduce((s, t) => s + signedAmount(t), 0);
    return { account, available: true, balanceMinor: account.openingBalanceMinor + delta };
  });
}

export function sumBalances(list: AccountForecast[]): {
  net: number;
  assets: number;
  debt: number;
} {
  let assets = 0;
  let debt = 0;
  for (const a of list) {
    if (!a.available) continue;
    if (a.balanceMinor >= 0) assets += a.balanceMinor;
    else debt += a.balanceMinor;
  }
  return { net: assets + debt, assets, debt };
}
