import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  differenceInMonths,
  format,
  getDaysInMonth,
  isValid,
  parse,
} from 'date-fns';
import { pl } from './plural';

/**
 * Календарная дата в формате YYYY-MM-DD. Хранится и сравнивается как строка,
 * в Date превращается только в локальной таймзоне — без сдвига через UTC.
 */
export type IsoDate = string;
/** Месяц в формате YYYY-MM. */
export type IsoMonth = string;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const MONTHS_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];
const MONTHS_SHORT = [
  'янв',
  'фев',
  'мар',
  'апр',
  'мая',
  'июн',
  'июл',
  'авг',
  'сен',
  'окт',
  'ноя',
  'дек',
];
const MONTHS_NOMINATIVE = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];
const MONTHS_PREPOSITIONAL = [
  'январе',
  'феврале',
  'марте',
  'апреле',
  'мае',
  'июне',
  'июле',
  'августе',
  'сентябре',
  'октябре',
  'ноябре',
  'декабре',
];
const MONTHS_COLUMN = [
  'Янв',
  'Фев',
  'Мар',
  'Апр',
  'Май',
  'Июн',
  'Июл',
  'Авг',
  'Сен',
  'Окт',
  'Ноя',
  'Дек',
];
const WEEKDAYS = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
];
export const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

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

export function addDaysIso(value: IsoDate, days: number): IsoDate {
  return toIsoDate(addDays(parseIsoDate(value), days));
}

/** Сколько календарных дней от a до b (b − a). */
export function diffDays(a: IsoDate, b: IsoDate): number {
  return differenceInCalendarDays(parseIsoDate(b), parseIsoDate(a));
}

function parts(value: IsoDate): { y: number; m: number; d: number } {
  const [y = 0, m = 1, d = 1] = value.split('-').map(Number);
  return { y, m, d };
}

export function monthOf(value: IsoDate): IsoMonth {
  return value.slice(0, 7);
}

export function monthStart(month: IsoMonth): IsoDate {
  return `${month}-01`;
}

export function daysInMonth(month: IsoMonth): number {
  return getDaysInMonth(parseIsoDate(monthStart(month)));
}

export function monthEnd(month: IsoMonth): IsoDate {
  return `${month}-${String(daysInMonth(month)).padStart(2, '0')}`;
}

export function addMonthsIso(month: IsoMonth, months: number): IsoMonth {
  return monthOf(toIsoDate(addMonths(parseIsoDate(monthStart(month)), months)));
}

/** Индекс дня недели, понедельник = 0. */
export function weekdayIndex(value: IsoDate): number {
  return (parseIsoDate(value).getDay() + 6) % 7;
}

function yearSuffix(y: number, today: IsoDate): string {
  return y === parts(today).y ? '' : ` ${y}`;
}

/** «25 октября» (год — только если не текущий). */
export function formatDayMonth(value: IsoDate, today: IsoDate = todayIsoDate()): string {
  const { y, m, d } = parts(value);
  return `${d} ${MONTHS_GENITIVE[m - 1]}${yearSuffix(y, today)}`;
}

/** «25 окт». */
export function formatDayMonthShort(value: IsoDate, today: IsoDate = todayIsoDate()): string {
  const { y, m, d } = parts(value);
  return `${d} ${MONTHS_SHORT[m - 1]}${yearSuffix(y, today)}`;
}

/** «Вторник, 20 октября». */
export function formatWeekdayDayMonth(value: IsoDate, today: IsoDate = todayIsoDate()): string {
  return `${WEEKDAYS[weekdayIndex(value)]}, ${formatDayMonth(value, today)}`;
}

/** «Октябрь 2026». */
export function formatMonthYear(month: IsoMonth): string {
  const { y, m } = parts(monthStart(month));
  return `${MONTHS_NOMINATIVE[m - 1]} ${y}`;
}

/** «Октябрь». */
export function formatMonthName(month: IsoMonth): string {
  return MONTHS_NOMINATIVE[parts(monthStart(month)).m - 1] ?? '';
}

/** «в октябре». */
export function formatInMonth(month: IsoMonth): string {
  return `в ${MONTHS_PREPOSITIONAL[parts(monthStart(month)).m - 1]}`;
}

/** «октября» — для «с 1 по 20 октября». */
export function monthGenitive(month: IsoMonth): string {
  return MONTHS_GENITIVE[parts(monthStart(month)).m - 1] ?? '';
}

/** «Окт» — подпись столбца. */
export function formatMonthColumn(month: IsoMonth): string {
  return MONTHS_COLUMN[parts(monthStart(month)).m - 1] ?? '';
}

export function dayOfMonth(value: IsoDate): number {
  return parts(value).d;
}

/** «сегодня», «вчера», «5 дней назад», «3 недели назад», «4 месяца назад», «2 года назад». */
export function formatAgo(value: IsoDate, today: IsoDate = todayIsoDate()): string {
  const days = diffDays(value, today);
  if (days <= 0) return 'сегодня';
  if (days === 1) return 'вчера';
  if (days < 7) return `${days} ${pl(days, 'день', 'дня', 'дней')} назад`;
  const months = differenceInMonths(parseIsoDate(today), parseIsoDate(value));
  if (months < 1) {
    const weeks = Math.floor(days / 7);
    return weeks === 1
      ? 'неделю назад'
      : `${weeks} ${pl(weeks, 'неделю', 'недели', 'недель')} назад`;
  }
  if (months < 12)
    return months === 1
      ? 'месяц назад'
      : `${months} ${pl(months, 'месяц', 'месяца', 'месяцев')} назад`;
  const years = Math.floor(months / 12);
  return years === 1 ? 'год назад' : `${years} ${pl(years, 'год', 'года', 'лет')} назад`;
}

/** «25 октября 2026» — всегда с годом (для текста, который уходит за пределы приложения). */
export function formatFullDate(value: IsoDate): string {
  const { y, m, d } = parts(value);
  return `${d} ${MONTHS_GENITIVE[m - 1]} ${y}`;
}
