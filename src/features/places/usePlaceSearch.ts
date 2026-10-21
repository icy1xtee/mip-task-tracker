import { useEffect, useState } from 'react';
import { searchPlaces, type LatLng, type PlaceCandidate } from './osm';

const MIN_QUERY = 3;
const DEBOUNCE_MS = 400;

/** Ответы на одинаковые запросы в той же части карты — из памяти, без повторного похода в Photon. */
const cache = new Map<string, PlaceCandidate[]>();

export type PlaceSearchState =
  | { status: 'idle' | 'loading' | 'error'; results: PlaceCandidate[] }
  | { status: 'ready'; results: PlaceCandidate[] };

/**
 * Поиск мест с debounce: запрос уходит через 400 мс после последнего символа и от 3 символов;
 * устаревший запрос отменяется. Центр карты (с точностью ~10 км) смещает выдачу к местам рядом.
 */
export function usePlaceSearch(query: string, near: LatLng | null): PlaceSearchState {
  const q = query.trim();
  const lat = near ? Number(near.lat.toFixed(1)) : null;
  const lng = near ? Number(near.lng.toFixed(1)) : null;
  const key = q.length >= MIN_QUERY ? `${q.toLocaleLowerCase('ru')}|${lat},${lng}` : null;
  const [result, setResult] = useState<{ key: string; state: PlaceSearchState } | null>(null);

  useEffect(() => {
    if (!key || cache.has(key)) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const center = lat !== null && lng !== null ? { lat, lng } : null;
      searchPlaces(q, center, controller.signal).then(
        (results) => {
          cache.set(key, results);
          setResult({ key, state: { status: 'ready', results } });
        },
        () => {
          if (!controller.signal.aborted)
            setResult({ key, state: { status: 'error', results: [] } });
        },
      );
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key, q, lat, lng]);

  if (!key) return { status: 'idle', results: [] };
  const cached = cache.get(key);
  if (cached) return { status: 'ready', results: cached };
  if (result?.key === key) return result.state;
  return { status: 'loading', results: [] };
}
