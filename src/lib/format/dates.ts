import { format, isValid, parse } from 'date-fns';
import { ru } from 'date-fns/locale';

/**
 * Календарная дата в формате YYYY-MM-DD. Хранится и сравнивается как строка,
 * в Date превращается только в локальной таймзоне — без сдвига через UTC.
 */
export type IsoDate = string;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): value is IsoDate {
  return ISO_DATE_PATTERN.test(value) && isValid(parse(value, 'yyyy-MM-dd', new Date()));
}

export function toIsoDate(date: Date): IsoDate {
  return format(date, 'yyyy-MM-dd');
}

export function parseIsoDate(value: IsoDate): Date {
  return parse(value, 'yyyy-MM-dd', new Date());
}

export function todayIsoDate(): IsoDate {
  return toIsoDate(new Date());
}

/** «20 октября 2026». */
export function formatIsoDate(value: IsoDate, pattern = 'd MMMM yyyy'): string {
  return format(parseIsoDate(value), pattern, { locale: ru });
}
