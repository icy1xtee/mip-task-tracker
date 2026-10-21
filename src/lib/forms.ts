import { z } from 'zod';
import { isIsoDate } from '@/lib/format/dates';
import { parseRublesToMinor } from '@/lib/format/money';
import { normalizeUrl } from '@/lib/format/url';

/** Поля форм: пользователь вводит строки, на выходе — доменные значения (копейки, IsoDate, null). */

export const titleField = (message = 'Добавьте название') =>
  z.string().trim().min(1, message).max(200, 'Слишком длинное название — до 200 символов');

export const optionalText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max, `Не больше ${max} символов`)
    .transform((v) => v || null);

const MONEY_HINT = 'Введите сумму числом, например 1 500';

export const optionalMoney = z
  .string()
  .trim()
  .refine((v) => v === '' || (parseRublesToMinor(v) ?? -1) >= 0, MONEY_HINT)
  .transform((v) => (v === '' ? null : (parseRublesToMinor(v) ?? 0)));

export const requiredMoney = z
  .string()
  .trim()
  .refine((v) => v !== '', 'Укажите сумму больше нуля')
  .refine((v) => parseRublesToMinor(v) !== null, MONEY_HINT)
  .refine((v) => (parseRublesToMinor(v) ?? 0) > 0, 'Укажите сумму больше нуля')
  .transform((v) => parseRublesToMinor(v) ?? 0);

/** Баланс счёта: может быть 0. Знак задаётся отдельно (деньги / долг). */
export const balanceMoney = z
  .string()
  .trim()
  .refine((v) => v !== '', 'Укажите остаток, можно 0')
  .refine((v) => (parseRublesToMinor(v) ?? -1) >= 0, MONEY_HINT)
  .transform((v) => parseRublesToMinor(v) ?? 0);

export const requiredDate = z.string().refine(isIsoDate, 'Укажите дату');

export const optionalDate = z
  .string()
  .refine((v) => v === '' || isIsoDate(v), 'Некорректная дата')
  .transform((v) => (v === '' ? null : v));

export const optionalUrl = z
  .string()
  .trim()
  .refine(
    (v) => v === '' || normalizeUrl(v) !== null,
    'Нужна ссылка вида https://… (javascript: и другие схемы не подходят)',
  )
  .transform((v) => (v === '' ? null : normalizeUrl(v)));

export const requiredUrl = z
  .string()
  .trim()
  .refine((v) => v !== '', 'Вставьте адрес ссылки')
  .refine(
    (v) => normalizeUrl(v) !== null,
    'Нужна ссылка вида https://… (javascript: и другие схемы не подходят)',
  )
  .transform((v) => normalizeUrl(v) ?? '');
