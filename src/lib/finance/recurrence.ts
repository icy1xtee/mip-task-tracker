import { addMonthsIso, addDaysIso, daysInMonth, monthOf, type IsoDate } from '@/lib/format/dates';
import type { Frequency } from '@/types/models';

export type RecurrenceSpec = {
  frequency: Frequency;
  startDate: IsoDate;
  endDate: IsoDate | null;
  /** Для monthly. Если null — берётся день из startDate. */
  dayOfMonth: number | null;
};

function clampDay(month: string, day: number): IsoDate {
  const d = Math.min(day, daysInMonth(month));
  return `${month}-${String(d).padStart(2, '0')}`;
}

/**
 * Даты экземпляров регулярного правила в диапазоне [from, to] включительно.
 * monthly: желаемый день месяца, а в коротких месяцах — последний день.
 * yearly: тот же день и месяц; 29 февраля в невисокосный год — 28 февраля.
 * weekly: каждые 7 дней от startDate.
 */
export function occurrenceDates(spec: RecurrenceSpec, from: IsoDate, to: IsoDate): IsoDate[] {
  const start = spec.startDate;
  const end = spec.endDate && spec.endDate < to ? spec.endDate : to;
  const lower = from > start ? from : start;
  if (lower > end) return [];

  const result: IsoDate[] = [];

  if (spec.frequency === 'weekly') {
    // Перешагнуть к первой дате >= lower без перебора всей истории.
    const skipWeeks = Math.max(0, Math.floor(daysBetween(start, lower) / 7));
    let date = addDaysIso(start, skipWeeks * 7);
    while (date < lower) date = addDaysIso(date, 7);
    while (date <= end) {
      result.push(date);
      date = addDaysIso(date, 7);
    }
    return result;
  }

  const startDay = Number(start.slice(8, 10));
  const step = spec.frequency === 'monthly' ? 1 : 12;
  const day = spec.frequency === 'monthly' ? (spec.dayOfMonth ?? startDay) : startDay;

  let month = monthOf(start);
  const lowerMonth = monthOf(lower);
  if (month < lowerMonth) {
    const gap = monthsBetween(month, lowerMonth);
    month = addMonthsIso(month, Math.floor(gap / step) * step);
  }
  for (;;) {
    const date = clampDay(month, day);
    if (date > end) break;
    if (date >= lower) result.push(date);
    month = addMonthsIso(month, step);
  }
  return result;
}

function daysBetween(a: IsoDate, b: IsoDate): number {
  const ms =
    Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) -
    Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
  return Math.round(ms / 86_400_000);
}

function monthsBetween(a: string, b: string): number {
  return (+b.slice(0, 4) - +a.slice(0, 4)) * 12 + (+b.slice(5, 7) - +a.slice(5, 7));
}

/** Детерминированный id экземпляра: один экземпляр на правило и дату, без дублей. */
export function occurrenceId(ruleId: string, date: IsoDate): string {
  return `${ruleId}_${date}`;
}
