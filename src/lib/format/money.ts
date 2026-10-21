/**
 * Деньги хранятся целыми числами в минимальных единицах (копейках).
 * Пользователь вводит и видит рубли; float в расчётах не используется.
 *
 * Формат дизайн-системы: разряды — неразрывный пробел, минус — «−» (U+2212),
 * валюта после числа: «7 000 ₽». Копейки показываются, только если они есть.
 */

const NBSP = '\u00a0';
const MINUS = '−';

function groupDigits(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

/** Модуль суммы без знака и валюты: «7 000», «7 000,50». */
export function formatAmount(amountMinor: number): string {
  const abs = Math.abs(amountMinor);
  const rubles = Math.trunc(abs / 100);
  const kopecks = abs % 100;
  return kopecks === 0
    ? groupDigits(rubles)
    : `${groupDigits(rubles)},${String(kopecks).padStart(2, '0')}`;
}

/** «7 000 ₽», для отрицательных — «−18 450 ₽». */
export function formatMoney(amountMinor: number): string {
  return `${amountMinor < 0 ? MINUS : ''}${formatAmount(amountMinor)}${NBSP}₽`;
}

/** Со знаком всегда: «+45 000 ₽», «−7 000 ₽». */
export function formatSignedMoney(amountMinor: number): string {
  const sign = amountMinor > 0 ? '+' : amountMinor < 0 ? MINUS : '';
  return `${sign}${formatAmount(amountMinor)}${NBSP}₽`;
}

/** Тысячи рублей с одним знаком: 4120000 → «41,2». Для подписей графика. */
export function formatThousands(amountMinor: number): string {
  return (Math.round(amountMinor / 10000) / 10).toFixed(1).replace('.', ',');
}

const RUBLES_PATTERN = /^([-−])?(\d+)(?:[.,](\d{1,2}))?$/;

/** «7 000,5» → 700050. Возвращает null для пустого или некорректного ввода. */
export function parseRublesToMinor(input: string): number | null {
  const normalized = input.replace(/[\s\u00a0\u202f]/g, '').replace('₽', '');
  const match = RUBLES_PATTERN.exec(normalized);
  if (!match) return null;

  const [, sign, rubles = '0', kopecks = ''] = match;
  const minor = Number(rubles) * 100 + Number(kopecks.padEnd(2, '0'));
  if (!Number.isSafeInteger(minor)) return null;
  return sign && minor !== 0 ? -minor : minor;
}

/** 700050 → «7 000,50» — значение для поля ввода при редактировании (без знака). */
export function minorToRublesInput(amountMinor: number): string {
  return formatAmount(amountMinor).replace(/\u00a0/g, ' ');
}
