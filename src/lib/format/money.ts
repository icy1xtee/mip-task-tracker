/**
 * Деньги хранятся целыми числами в минимальных единицах (копейках).
 * Пользователь вводит и видит рубли; float в расчётах не используется.
 */

const rubFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatMoney(amountMinor: number): string {
  return rubFormatter.format(amountMinor / 100);
}

const RUBLES_PATTERN = /^(-)?(\d+)(?:[.,](\d{1,2}))?$/;

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

/** 700050 → «7000,50» — значение для поля ввода при редактировании. */
export function minorToRublesInput(amountMinor: number): string {
  const sign = amountMinor < 0 ? '-' : '';
  const abs = Math.abs(amountMinor);
  const rubles = Math.trunc(abs / 100);
  const kopecks = abs % 100;
  return kopecks === 0
    ? `${sign}${rubles}`
    : `${sign}${rubles},${String(kopecks).padStart(2, '0')}`;
}
