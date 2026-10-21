import {
  actualBalances,
  computeForecast,
  type Forecast,
  type ForecastInput,
} from '@/lib/finance/forecast';
import { signedAmount } from '@/lib/finance/plan';
import type { IsoDate } from '@/lib/format/dates';

export type ForecastBreakdown = {
  forecast: Forecast;
  /** «Сейчас на счетах» по тем же счетам, что вошли в прогноз. */
  nowMinor: number;
  incomeMinor: number;
  expenseMinor: number;
  /** Сколько плановых операций вошло в расчёт. */
  count: number;
  /** Из них — прошедшие, но не отмеченные ни оплаченными, ни пропущенными. */
  overdueCount: number;
};

/**
 * Разложение прогноза на формулу из макета:
 * «Сейчас на счетах» + поступления − траты = прогноз на конец дня.
 */
export function forecastBreakdown(
  input: ForecastInput,
  date: IsoDate,
  today: IsoDate,
): ForecastBreakdown {
  const forecast = computeForecast(input, date);
  const included = new Set(forecast.accounts.filter((a) => a.available).map((a) => a.account.id));
  const now = actualBalances(
    input.accounts.filter((a) => included.has(a.id)),
    input.transactions,
    today,
  ).reduce((s, a) => s + (a.available ? a.balanceMinor : a.account.openingBalanceMinor), 0);

  let incomeMinor = 0;
  let expenseMinor = 0;
  const add = (v: number) => (v > 0 ? (incomeMinor += v) : (expenseMinor += v));
  for (const t of forecast.transactions) if (t.date > today) add(signedAmount(t));
  for (const i of forecast.pending) add(signedAmount(i));

  return {
    forecast,
    nowMinor: now,
    incomeMinor,
    expenseMinor,
    count: forecast.pending.length,
    overdueCount: forecast.pending.filter((i) => i.date < today).length,
  };
}
