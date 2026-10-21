import { computeForecast, type ForecastInput } from '@/lib/finance/forecast';
import { expandPlan, type PlanItem } from '@/lib/finance/plan';
import { addDaysIso, monthEnd, monthOf, type IsoDate } from '@/lib/format/dates';
import type { Account } from '@/types/models';

/** Порог «крупной операции» для обзора: 10 000 ₽ (решение зафиксировано в README). */
export const LARGE_OPERATION_MINOR = 10_000_00;
const HORIZON_DAYS = 60;

/** Неоплаченные элементы плана: просроченные (после фиксации баланса) и ближайшие. */
export function upcomingPayments(input: ForecastInput, today: IsoDate, limit = 5): PlanItem[] {
  const snapshot = new Map(input.accounts.map((a) => [a.id, a.balanceAsOfDate]));
  const from = input.accounts.reduce(
    (min, a) => (a.balanceAsOfDate < min ? a.balanceAsOfDate : min),
    today,
  );
  return expandPlan(input, addDaysIso(from, 1), addDaysIso(today, 30))
    .filter((i) => i.status === 'planned' && i.date > (snapshot.get(i.accountId) ?? today))
    .slice(0, limit);
}

/**
 * Прогноз для карточки «Деньги»: на ближайшую дату с крупной операцией (≥ 10 000 ₽)
 * в пределах 60 дней, а если таких нет — на конец текущего месяца.
 */
export function overviewForecast(input: ForecastInput, today: IsoDate) {
  const accounts: Account[] = input.accounts;
  if (!accounts.length) return null;
  const big = expandPlan(input, addDaysIso(today, 1), addDaysIso(today, HORIZON_DAYS)).find(
    (i) => i.status === 'planned' && i.amountMinor >= LARGE_OPERATION_MINOR,
  );
  const date = big?.date ?? monthEnd(monthOf(today));
  const forecast = computeForecast(input, date);
  return {
    date,
    totalMinor: forecast.totalMinor,
    trigger: big ?? null,
    count: forecast.pending.length,
  };
}
