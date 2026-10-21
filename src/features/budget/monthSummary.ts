import {
  byCategory,
  expenses,
  monthWindow,
  percentChange,
  totalInRange,
} from '@/lib/finance/analytics';
import {
  addMonthsIso,
  dayOfMonth,
  daysInMonth,
  monthEnd,
  monthOf,
  monthStart,
  type IsoDate,
  type IsoMonth,
} from '@/lib/format/dates';
import type { Transaction } from '@/types/models';

/** Расчёты экрана «Фактические расходы» для выбранного месяца. Только сохранённые траты. */
export type ActualSummary = {
  month: IsoMonth;
  isCurrent: boolean;
  /** Последний учтённый день: сегодня для текущего месяца, иначе конец месяца. */
  periodEndDay: number;
  totalMinor: number;
  count: number;
  /** Тот же период прошлого месяца; null — сравнивать не с чем. */
  previousMinor: number | null;
  previousChange: number | null;
  /** Прогноз на месяц при сохранении темпа (только для текущего месяца). */
  projectionMinor: number | null;
  /** Среднее за полные месяцы до выбранного (в окне графика). */
  averageMinor: number | null;
  averageMonths: number;
  categories: {
    id: string;
    currentMinor: number;
    previousMinor: number | null;
    change: number | null;
  }[];
  months: { month: IsoMonth; totalMinor: number; isSelected: boolean }[];
};

export function summarizeMonth(
  transactions: Transaction[],
  month: IsoMonth,
  today: IsoDate,
): ActualSummary {
  const list = expenses(transactions);
  const isCurrent = monthOf(today) === month;
  const periodEndDay = isCurrent ? dayOfMonth(today) : daysInMonth(month);
  const from = monthStart(month);
  const to = isCurrent ? today : monthEnd(month);

  const prevMonth = addMonthsIso(month, -1);
  const prevFrom = monthStart(prevMonth);
  const prevTo = isCurrent
    ? `${prevMonth}-${String(Math.min(periodEndDay, daysInMonth(prevMonth))).padStart(2, '0')}`
    : monthEnd(prevMonth);

  const inMonth = list.filter((t) => t.date >= from && t.date <= to);
  const totalMinor = inMonth.reduce((s, t) => s + t.amountMinor, 0);
  const prevHasData = list.some((t) => monthOf(t.date) === prevMonth);
  const previousMinor = prevHasData ? totalInRange(list, prevFrom, prevTo) : null;

  const window = monthWindow(list, month, 6);
  const months = window.map((m) => ({
    month: m,
    totalMinor: m === month ? totalMinor : totalInRange(list, monthStart(m), monthEnd(m)),
    isSelected: m === month,
  }));
  const fullBefore = months.filter((m) => !m.isSelected);
  const averageMinor = fullBefore.length
    ? Math.round(fullBefore.reduce((s, m) => s + m.totalMinor, 0) / fullBefore.length)
    : null;

  // Темп: потрачено за прошедшие дни × дней в месяце, округлено до 100 ₽.
  const projectionMinor =
    isCurrent && totalMinor > 0
      ? Math.round(((totalMinor / periodEndDay) * daysInMonth(month)) / 10_000) * 10_000
      : null;

  const cur = byCategory(list, from, to);
  const prev = prevHasData ? byCategory(list, prevFrom, prevTo) : new Map<string, number>();
  const ids = new Set([...cur.keys(), ...prev.keys()]);
  const categories = [...ids]
    .map((id) => {
      const currentMinor = cur.get(id) ?? 0;
      const previous = prevHasData ? (prev.get(id) ?? 0) : null;
      return {
        id,
        currentMinor,
        previousMinor: previous,
        change: previous ? percentChange(currentMinor, previous) : null,
      };
    })
    .sort(
      (a, b) => b.currentMinor - a.currentMinor || (b.previousMinor ?? 0) - (a.previousMinor ?? 0),
    );

  return {
    month,
    isCurrent,
    periodEndDay,
    totalMinor,
    count: inMonth.length,
    previousMinor,
    previousChange: previousMinor ? percentChange(totalMinor, previousMinor) : null,
    projectionMinor,
    averageMinor,
    averageMonths: fullBefore.length,
    categories,
    months,
  };
}
