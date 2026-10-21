import { diffDays, formatAgo, type IsoDate } from '@/lib/format/dates';
import { pl } from '@/lib/format/plural';
import type { Place, PlaceCategory, PlaceVisit } from '@/types/models';
import { categoryLabel, PARTNERS, type PartnerKey } from './placeMeta';

/**
 * Чистая логика раздела «Места»: агрегаты по посещениям, фильтры, сортировка и рекомендации.
 * Оценки — целые 1–10; средние — обычные числа, на экране — с одним знаком («8,5»).
 */

export type PartnerScores = { rating: number | null; returnScore: number | null };

export type PlaceStats = {
  /** Посещения, новые сверху. */
  visits: PlaceVisit[];
  lastVisit: IsoDate | null;
  daysSince: number | null;
  /** Сумма трат по посещениям, где она указана. */
  spentMinor: number;
  spentKnown: boolean;
  partners: Record<PartnerKey, PartnerScores>;
  /** Впечатление: среднее из средних оценок партнёров. */
  rating: number | null;
  /** Желание вернуться: так же, по оценкам «вернуться». */
  returnScore: number | null;
};

export type PlaceItem = { place: Place; stats: PlaceStats };

export function average(values: (number | null)[]): number | null {
  const known = values.filter((v): v is number => v !== null);
  return known.length ? known.reduce((a, b) => a + b, 0) / known.length : null;
}

export function sortVisits(visits: PlaceVisit[]): PlaceVisit[] {
  return visits
    .slice()
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        (b.createdAt?.getTime() ?? Infinity) - (a.createdAt?.getTime() ?? Infinity),
    );
}

export function placeStats(visits: PlaceVisit[], today: IsoDate): PlaceStats {
  const sorted = sortVisits(visits);
  const partners = {} as Record<PartnerKey, PartnerScores>;
  for (const p of PARTNERS) {
    partners[p.key] = {
      rating: average(sorted.map((v) => v[p.rating])),
      returnScore: average(sorted.map((v) => v[p.returnScore])),
    };
  }
  const lastVisit = sorted[0]?.date ?? null;
  const spent = sorted.filter((v) => v.spentMinor !== null);
  return {
    visits: sorted,
    lastVisit,
    daysSince: lastVisit ? Math.max(0, diffDays(lastVisit, today)) : null,
    spentMinor: spent.reduce((sum, v) => sum + (v.spentMinor ?? 0), 0),
    spentKnown: spent.length > 0,
    partners,
    rating: average(PARTNERS.map((p) => partners[p.key].rating)),
    returnScore: average(PARTNERS.map((p) => partners[p.key].returnScore)),
  };
}

export function buildPlaceItems(
  places: Place[],
  visits: PlaceVisit[],
  today: IsoDate,
): PlaceItem[] {
  const byPlace = new Map<string, PlaceVisit[]>();
  for (const v of visits) {
    const list = byPlace.get(v.placeId);
    if (list) list.push(v);
    else byPlace.set(v.placeId, [v]);
  }
  return places.map((place) => ({ place, stats: placeStats(byPlace.get(place.id) ?? [], today) }));
}

/** «8,5». */
export function formatScore(value: number): string {
  return value.toFixed(1).replace('.', ',');
}

/** «8» для целых, «8,5» для средних. */
export function formatScoreShort(value: number): string {
  return Number.isInteger(value) ? String(value) : formatScore(value);
}

// ---- быстрые представления ----

/** Пороги «любимого» и т.п. — простые и прозрачные, без ML. */
export const FAVORITE_MIN = 8;
export const RETURN_MIN = 8;
export const BOTH_MIN = 8;
export const LONG_AGO_DAYS = 90;
export const LONG_AGO_MIN_RATING = 7;

export const isFavorite = (s: PlaceStats) => s.rating !== null && s.rating >= FAVORITE_MIN;
export const wantsReturn = (s: PlaceStats) => s.returnScore !== null && s.returnScore >= RETURN_MIN;
export const bothLiked = (s: PlaceStats) =>
  PARTNERS.every((p) => (s.partners[p.key].rating ?? 0) >= BOTH_MIN);
export const longAgo = (s: PlaceStats) =>
  s.daysSince !== null &&
  s.daysSince >= LONG_AGO_DAYS &&
  s.rating !== null &&
  s.rating >= LONG_AGO_MIN_RATING;

export type PlaceView = 'all' | 'visited' | 'want' | 'favorite' | 'return' | 'both' | 'longAgo';

export const PLACE_VIEWS: { value: PlaceView; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'visited', label: 'Были' },
  { value: 'want', label: 'Хотим' },
  { value: 'favorite', label: 'Любимые' },
  { value: 'return', label: 'Стоит вернуться' },
  { value: 'both', label: 'Нравится обоим' },
  { value: 'longAgo', label: 'Давно не были' },
];

export function matchesView({ place, stats }: PlaceItem, view: PlaceView): boolean {
  switch (view) {
    case 'all':
      return true;
    case 'visited':
      return place.status === 'visited';
    case 'want':
      return place.status === 'want-to-visit';
    case 'favorite':
      return isFavorite(stats);
    case 'return':
      return wantsReturn(stats);
    case 'both':
      return bothLiked(stats);
    case 'longAgo':
      return longAgo(stats);
  }
}

// ---- фильтры и сортировка ----

export type MapBounds = { west: number; south: number; east: number; north: number };

export type PlaceFilters = {
  view: PlaceView;
  category: PlaceCategory | 'all';
  city: string;
  /** 0 — любая оценка. */
  minRating: number;
  /** Только места в видимой области карты («рядом»). */
  bounds: MapBounds | null;
};

export const NO_FILTERS: PlaceFilters = {
  view: 'all',
  category: 'all',
  city: 'all',
  minRating: 0,
  bounds: null,
};

export function inBounds(place: Pick<Place, 'latitude' | 'longitude'>, b: MapBounds): boolean {
  return (
    place.latitude >= b.south &&
    place.latitude <= b.north &&
    place.longitude >= b.west &&
    place.longitude <= b.east
  );
}

export function filterPlaces(items: PlaceItem[], f: PlaceFilters): PlaceItem[] {
  return items.filter(
    (i) =>
      matchesView(i, f.view) &&
      (f.category === 'all' || i.place.category === f.category) &&
      (f.city === 'all' || i.place.city === f.city) &&
      (f.minRating === 0 || (i.stats.rating ?? 0) >= f.minRating) &&
      (!f.bounds || inBounds(i.place, f.bounds)),
  );
}

/** Сколько дополнительных фильтров включено (для подписи кнопки «Фильтры»). */
export function extraFilterCount(f: PlaceFilters): number {
  return (
    Number(f.category !== 'all') +
    Number(f.city !== 'all') +
    Number(f.minRating !== 0) +
    Number(f.bounds !== null)
  );
}

export function cityOptions(items: PlaceItem[]): string[] {
  const cities = new Set<string>();
  for (const i of items) if (i.place.city) cities.add(i.place.city);
  return [...cities].sort((a, b) => a.localeCompare(b, 'ru'));
}

export type PlaceSort = 'rating' | 'return' | 'recent' | 'visits' | 'spent' | 'added';

export const PLACE_SORTS: { value: PlaceSort; label: string }[] = [
  { value: 'rating', label: 'По оценке' },
  { value: 'return', label: 'По желанию вернуться' },
  { value: 'recent', label: 'По последнему визиту' },
  { value: 'visits', label: 'По числу посещений' },
  { value: 'spent', label: 'По тратам' },
  { value: 'added', label: 'Недавно добавленные' },
];

/** Ещё не записанный сервером createdAt (только что созданное место) — считаем самым новым. */
const addedAt = (p: Place) => p.createdAt?.getTime() ?? Infinity;

function sortKey(i: PlaceItem, sort: PlaceSort): number | string | null {
  switch (sort) {
    case 'rating':
      return i.stats.rating;
    case 'return':
      return i.stats.returnScore;
    case 'recent':
      return i.stats.lastVisit;
    case 'visits':
      return i.stats.visits.length || null;
    case 'spent':
      return i.stats.spentKnown ? i.stats.spentMinor : null;
    case 'added':
      return addedAt(i.place);
  }
}

/** По убыванию; места без значения (не оценены, не были) — в конце, внутри — по названию. */
export function sortPlaces(items: PlaceItem[], sort: PlaceSort): PlaceItem[] {
  return items.slice().sort((a, b) => {
    const ka = sortKey(a, sort);
    const kb = sortKey(b, sort);
    if (ka !== kb) {
      if (ka === null) return 1;
      if (kb === null) return -1;
      if (typeof ka === 'string' && typeof kb === 'string') return kb.localeCompare(ka);
      if (typeof ka === 'number' && typeof kb === 'number' && ka !== kb) return kb - ka;
    }
    return a.place.name.localeCompare(b.place.name, 'ru');
  });
}

// ---- рекомендации ----

/** За сколько дней «давность» визита набирает максимум. */
const RECENCY_FULL_DAYS = 180;
/** Не советуем вернуться туда, где были на днях. */
const RECOMMEND_MIN_DAYS = 30;
const RECOMMEND_MIN_RETURN = 7;

/**
 * recommendationScore = впечатление × 0,4 + желание вернуться × 0,4 + давность × 0,2,
 * где давность — 0…10 пропорционально дням с последнего визита (10 — от полугода).
 */
export function recommendationScore(s: PlaceStats): number | null {
  if (s.daysSince === null) return null;
  const rating = s.rating ?? s.returnScore;
  const returnScore = s.returnScore ?? s.rating;
  if (rating === null || returnScore === null) return null;
  const recency = Math.min(s.daysSince / RECENCY_FULL_DAYS, 1) * 10;
  return rating * 0.4 + returnScore * 0.4 + recency * 0.2;
}

export function recommendationReason(s: PlaceStats): string {
  const old = s.daysSince !== null && s.daysSince >= LONG_AGO_DAYS;
  if (bothLiked(s))
    return old
      ? 'Вы оба оценили место высоко, но давно здесь не были.'
      : 'Вы оба оценили место высоко.';
  if (PARTNERS.every((p) => (s.partners[p.key].returnScore ?? 0) >= RETURN_MIN))
    return 'Вам обоим хочется сюда вернуться.';
  return old ? 'Понравилось, а были давно.' : 'Хочется вернуться.';
}

export type Recommendation = { item: PlaceItem; score: number; reason: string };

/** Кандидат в «Вам стоит сходить сюда снова»: высокое желание вернуться и хотя бы месяц с визита. */
export function recommendable(s: PlaceStats): boolean {
  return (
    s.daysSince !== null &&
    s.daysSince >= RECOMMEND_MIN_DAYS &&
    (s.returnScore ?? s.rating ?? 0) >= RECOMMEND_MIN_RETURN
  );
}

export function recommendations(items: PlaceItem[], limit = 3): Recommendation[] {
  const result: Recommendation[] = [];
  for (const item of items) {
    const s = item.stats;
    if (!recommendable(s)) continue;
    const score = recommendationScore(s);
    if (score !== null) result.push({ item, score, reason: recommendationReason(s) });
  }
  return result
    .sort((a, b) => b.score - a.score || a.item.place.name.localeCompare(b.item.place.name, 'ru'))
    .slice(0, limit);
}

// ---- отображение ----

const median = (xs: number[]) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;

/**
 * Точки для первого показа карты — без далёких выбросов (место в другом городе),
 * чтобы карта не открывалась в масштабе страны. radius — градусы широты (~110 км).
 */
export function mainCluster<T extends { latitude: number; longitude: number }>(
  points: T[],
  radius = 1,
): T[] {
  if (points.length < 3) return points;
  const lat = median(points.map((p) => p.latitude));
  const lng = median(points.map((p) => p.longitude));
  const near = points.filter(
    (p) => Math.abs(p.latitude - lat) <= radius && Math.abs(p.longitude - lng) <= radius * 2,
  );
  return near.length ? near : points;
}

export type MarkerKind = 'want' | 'visited' | 'favorite';

export function markerKind({ place, stats }: PlaceItem): MarkerKind {
  if (place.status === 'want-to-visit') return 'want';
  return isFavorite(stats) ? 'favorite' : 'visited';
}

/** Подпись под названием: категория · город · когда были (или «хотим»). */
export function placeSubtitle({ place, stats }: PlaceItem, today: IsoDate): string {
  const when = stats.lastVisit
    ? formatAgo(stats.lastVisit, today)
    : place.status === 'want-to-visit'
      ? 'хотим'
      : null;
  return [categoryLabel(place.category), place.city, when].filter(Boolean).join(' · ');
}

export function placesLead(items: PlaceItem[]): string {
  if (!items.length) return 'Пока пусто';
  const visited = items.filter((i) => i.place.status === 'visited').length;
  const want = items.length - visited;
  return `${items.length} ${pl(items.length, 'место', 'места', 'мест')} · были в ${visited}, хотим в ${want}`;
}

export const placeDeleteCopy = {
  title: (i: PlaceItem) => `Удалить «${i.place.name}»?`,
  text: (i: PlaceItem) =>
    i.stats.visits.length
      ? `Место пропадёт с карты вместе с ${i.stats.visits.length} ${pl(i.stats.visits.length, 'посещением', 'посещениями', 'посещениями')} и оценками.`
      : 'Место пропадёт с карты и из списка.',
};

export const visitDeleteCopy = {
  title: () => 'Удалить посещение?',
  text: () => 'Оценки и сумма этого визита больше не будут учитываться в среднем.',
};

/** Маршрут в Яндекс Картах до точки (своей маршрутизации в приложении нет). */
export function routeUrl(p: Pick<Place, 'latitude' | 'longitude'>): string {
  return `https://yandex.ru/maps/?rtext=~${p.latitude},${p.longitude}&rtt=auto`;
}

const OSM_TYPES: Record<string, string> = { N: 'node', W: 'way', R: 'relation' };

export function osmUrl(providerPlaceId: string): string | null {
  const type = OSM_TYPES[providerPlaceId[0] ?? ''];
  const id = providerPlaceId.slice(1);
  return type && /^\d+$/.test(id) ? `https://www.openstreetmap.org/${type}/${id}` : null;
}

const fold = (text: string) => text.toLocaleLowerCase('ru').replace(/ё/g, 'е');

/** Сохранённые места по названию и адресу — показываются в поиске первыми. */
export function searchSaved(items: PlaceItem[], query: string, limit = 4): PlaceItem[] {
  const q = fold(query.trim());
  if (!q) return [];
  return items
    .filter((i) => fold(`${i.place.name} ${i.place.address ?? ''}`).includes(q))
    .slice(0, limit);
}
