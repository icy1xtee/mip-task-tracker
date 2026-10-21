import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  type DocumentData,
  type DocumentReference,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { getFirebase } from './client';

export type CollectionName =
  | 'tasks'
  | 'activities'
  | 'accounts'
  | 'plannedEntries'
  | 'recurringRules'
  | 'recurringOccurrences'
  | 'transactions'
  | 'links';

export function db() {
  return getFirebase().db;
}

export function docRef(name: CollectionName, id: string): DocumentReference {
  return doc(db(), name, id);
}

export function newDocRef(name: CollectionName): DocumentReference {
  return doc(collection(db(), name));
}

export const created = () => ({ createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
export const touched = () => ({ updatedAt: serverTimestamp() });

/** Ошибка записи, которую UI показывает как есть (см. getErrorMessage). */
export class WriteError extends Error {
  readonly code: 'offline' | 'timeout' | 'conflict';
  constructor(code: 'offline' | 'timeout' | 'conflict', message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

const WRITE_TIMEOUT_MS = 15_000;

/**
 * Все записи идут через эту обёртку. Офлайн запись не начинается вовсе —
 * иначе Firestore поставит её в очередь, и UI не сможет честно сказать, сохранено ли.
 * Если сервер не подтвердил запись за 15 секунд — показываем ошибку, а не успех.
 */
export async function write<T>(operation: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) throw new WriteError('offline');
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new WriteError('timeout')), WRITE_TIMEOUT_MS);
  });
  try {
    return await Promise.race([operation(), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export type CollectionState<T> =
  | { status: 'loading'; data: T[]; error: null }
  | { status: 'ready'; data: T[]; error: null }
  | { status: 'error'; data: T[]; error: unknown };

/**
 * Realtime-подписка на коллекцию: изменения с телефона партнёра видны сразу.
 * Данных у двоих немного, поэтому коллекции читаются целиком; отписка — при размонтировании.
 */
export function useCollection<T>(
  name: CollectionName,
  parse: (id: string, data: DocumentData) => T | null,
): CollectionState<T> & { retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<CollectionState<T>>({
    status: 'loading',
    data: [],
    error: null,
  });

  useEffect(() => {
    return onSnapshot(
      collection(db(), name),
      (snapshot) => {
        const data: T[] = [];
        for (const d of snapshot.docs) {
          const item = parse(d.id, d.data());
          if (item) data.push(item);
        }
        setState({ status: 'ready', data, error: null });
      },
      (error) => setState((prev) => ({ status: 'error', data: prev.data, error })),
    );
  }, [name, parse, attempt]);

  return {
    ...state,
    retry: () => {
      setState((prev) => ({ status: 'loading', data: prev.data, error: null }));
      setAttempt((n) => n + 1);
    },
  };
}

/** Объединяет состояния нескольких коллекций в одно для экрана. */
export function combine(...states: { status: string; error: unknown; retry: () => void }[]) {
  const failed = states.find((s) => s.status === 'error');
  if (failed) {
    return {
      status: 'error' as const,
      error: failed.error,
      retry: () => states.forEach((s) => s.status === 'error' && s.retry()),
    };
  }
  if (states.some((s) => s.status === 'loading'))
    return { status: 'loading' as const, error: null, retry: () => {} };
  return { status: 'ready' as const, error: null, retry: () => {} };
}
