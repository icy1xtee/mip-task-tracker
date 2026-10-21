import { addMonthsIso, monthOf, type IsoDate, type IsoMonth } from '@/lib/format/dates';
import type { Transaction } from '@/types/models';

/**
 * Аналитика фактических расходов — только по сохранённым transactions с type == expense.
 * Никаких выдуманных точек: месяцы без данных до первой траты не показываются.
 */

export function expenses(transactions: Transaction[]): Transaction[] {
  return transactions.filter((t) => t.type === 'expense');
}

export function totalInRange(list: Transaction[], from: IsoDate, to: IsoDate): number {
  return list.filter((t) => t.date >= from && t.date <= to).reduce((s, t) => s + t.amountMinor, 0);
}

export function byCategory(list: Transaction[], from: IsoDate, to: IsoDate): Map<string, number> {
  const result = new Map<string, number>();
  for (const t of list) {
    if (t.date < from || t.date > to) continue;
    result.set(t.category, (result.get(t.category) ?? 0) + t.amountMinor);
  }
  return result;
}

export function firstMonthWithData(list: Transaction[]): IsoMonth | null {
  let first: IsoDate | null = null;
  for (const t of list) if (first === null || t.date < first) first = t.date;
  return first ? monthOf(first) : null;
}

/** До `count` месяцев, заканчивая `last`, но не раньше первого месяца с данными. */
export function monthWindow(list: Transaction[], last: IsoMonth, count: number): IsoMonth[] {
  const first = firstMonthWithData(list);
  if (!first || first > last) return [];
  const months: IsoMonth[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const m = addMonthsIso(last, -i);
    if (m >= first) months.push(m);
  }
  return months;
}

/** Изменение в процентах, округлённое до целого; null, если базы нет. */
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
