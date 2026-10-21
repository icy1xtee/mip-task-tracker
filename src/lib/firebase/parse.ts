import { Timestamp, type DocumentData } from 'firebase/firestore';
import { isIsoDate, type IsoDate } from '@/lib/format/dates';

/**
 * Мягкий разбор документов Firestore в доменные типы. Документ с неверными
 * обязательными полями пропускается (parse вернёт null), а не роняет экран.
 */

export class InvalidDocument extends Error {}

export function str(data: DocumentData, key: string): string {
  const v = data[key];
  if (typeof v !== 'string' || v.trim() === '') throw new InvalidDocument(key);
  return v;
}

export function strOrNull(data: DocumentData, key: string): string | null {
  const v = data[key];
  return typeof v === 'string' && v.trim() !== '' ? v : null;
}

export function int(data: DocumentData, key: string): number {
  const v = data[key];
  if (typeof v !== 'number' || !Number.isSafeInteger(v)) throw new InvalidDocument(key);
  return v;
}

export function intOrNull(data: DocumentData, key: string): number | null {
  const v = data[key];
  return typeof v === 'number' && Number.isSafeInteger(v) ? v : null;
}

export function bool(data: DocumentData, key: string): boolean {
  return data[key] === true;
}

export function isoDate(data: DocumentData, key: string): IsoDate {
  const v = data[key];
  if (typeof v !== 'string' || !isIsoDate(v)) throw new InvalidDocument(key);
  return v;
}

export function isoDateOrNull(data: DocumentData, key: string): IsoDate | null {
  const v = data[key];
  return typeof v === 'string' && isIsoDate(v) ? v : null;
}

export function oneOf<T extends string>(data: DocumentData, key: string, values: readonly T[]): T {
  const v = data[key];
  if (typeof v !== 'string' || !values.includes(v as T)) throw new InvalidDocument(key);
  return v as T;
}

export function oneOfOrNull<T extends string>(
  data: DocumentData,
  key: string,
  values: readonly T[],
): T | null {
  const v = data[key];
  return typeof v === 'string' && values.includes(v as T) ? (v as T) : null;
}

export function strings(data: DocumentData, key: string): string[] {
  const v = data[key];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

function date(data: DocumentData, key: string): Date | null {
  const v = data[key];
  return v instanceof Timestamp ? v.toDate() : null;
}

export function audit(id: string, data: DocumentData) {
  return { id, createdAt: date(data, 'createdAt'), updatedAt: date(data, 'updatedAt') };
}

/** Оборачивает парсер: невалидный документ → null + предупреждение в консоль. */
export function safeParser<T>(name: string, parse: (id: string, data: DocumentData) => T) {
  return (id: string, data: DocumentData): T | null => {
    try {
      return parse(id, data);
    } catch (error) {
      if (error instanceof InvalidDocument) {
        console.warn(`[${name}/${id}] пропущен: некорректное поле «${error.message}»`);
        return null;
      }
      throw error;
    }
  };
}
