import { describe, expect, it } from 'vitest';
import type { Place, PlaceVisit } from '@/types/models';
import {
  buildPlaceItems,
  filterPlaces,
  formatScore,
  mainCluster,
  markerKind,
  NO_FILTERS,
  osmUrl,
  placeStats,
  recommendations,
  recommendationScore,
  searchSaved,
  sortPlaces,
  type PlaceItem,
} from './placesView';

const TODAY = '2026-10-20';

const place = (id: string, extra: Partial<Place> = {}): Place => ({
  id,
  provider: 'osm',
  providerPlaceId: `N${id.length}`,
  name: id,
  address: null,
  city: 'Санкт-Петербург',
  latitude: 59.93,
  longitude: 30.31,
  category: 'bar',
  status: 'visited',
  note: null,
  createdAt: new Date(2026, 0, 1),
  updatedAt: null,
  ...extra,
});

let seq = 0;
const visit = (placeId: string, date: string, scores: Partial<PlaceVisit> = {}): PlaceVisit => ({
  id: `v${++seq}`,
  placeId,
  date,
  spentMinor: null,
  pavelRating: null,
  milaRating: null,
  pavelReturnScore: null,
  milaReturnScore: null,
  note: null,
  createdAt: null,
  updatedAt: null,
  ...scores,
});

const rated = (placeId: string, date: string, p: number, m: number, pr = p, mr = m) =>
  visit(placeId, date, {
    pavelRating: p,
    milaRating: m,
    pavelReturnScore: pr,
    milaReturnScore: mr,
  });

describe('placeStats', () => {
  it('средние по партнёрам и общая оценка, история — новые сверху', () => {
    const s = placeStats(
      [
        rated('a', '2026-05-03', 9, 8, 7, 9),
        visit('a', '2026-09-14', { pavelRating: 8, milaRating: 9, spentMinor: 684000 }),
      ],
      TODAY,
    );
    expect(s.visits.map((v) => v.date)).toEqual(['2026-09-14', '2026-05-03']);
    expect(s.lastVisit).toBe('2026-09-14');
    expect(s.daysSince).toBe(36);
    expect(s.partners.pavel).toEqual({ rating: 8.5, returnScore: 7 });
    expect(s.partners.mila).toEqual({ rating: 8.5, returnScore: 9 });
    expect(s.rating).toBe(8.5);
    expect(s.returnScore).toBe(8);
    expect(s.spentMinor).toBe(684000);
    expect(s.spentKnown).toBe(true);
  });

  it('если оценил только один — общая оценка по нему; без визитов — пусто', () => {
    const one = placeStats([visit('a', '2026-10-01', { milaRating: 9 })], TODAY);
    expect(one.rating).toBe(9);
    expect(one.returnScore).toBeNull();
    const none = placeStats([], TODAY);
    expect(none).toMatchObject({
      rating: null,
      lastVisit: null,
      daysSince: null,
      spentKnown: false,
    });
  });

  it('formatScore — один знак с запятой', () => {
    expect(formatScore(8.5)).toBe('8,5');
    expect(formatScore(9)).toBe('9,0');
    expect(formatScore(8.333)).toBe('8,3');
  });
});

describe('представления, фильтры и сортировка', () => {
  const items = buildPlaceItems(
    [
      place('fav'),
      place('meh', { category: 'cafe', city: 'Москва' }),
      place('want', { status: 'want-to-visit', latitude: 55.75, longitude: 37.61 }),
      place('old'),
    ],
    [
      rated('fav', '2026-10-10', 9, 9),
      rated('meh', '2026-10-01', 5, 6),
      rated('old', '2026-03-01', 8, 7),
      visit('fav', '2026-08-01', { spentMinor: 100000 }),
    ],
    TODAY,
  );
  const ids = (list: PlaceItem[]) => list.map((i) => i.place.id);
  const only = (f: Partial<typeof NO_FILTERS>) => ids(filterPlaces(items, { ...NO_FILTERS, ...f }));

  it('быстрые представления', () => {
    expect(only({ view: 'visited' })).toEqual(['fav', 'meh', 'old']);
    expect(only({ view: 'want' })).toEqual(['want']);
    expect(only({ view: 'favorite' })).toEqual(['fav']);
    expect(only({ view: 'both' })).toEqual(['fav']);
    expect(only({ view: 'return' })).toEqual(['fav']);
    expect(only({ view: 'longAgo' })).toEqual(['old']);
  });

  it('категория, город, оценка и видимая область карты', () => {
    expect(only({ category: 'cafe' })).toEqual(['meh']);
    expect(only({ city: 'Москва' })).toEqual(['meh']);
    expect(only({ minRating: 7 })).toEqual(['fav', 'old']);
    expect(only({ bounds: { west: 37, east: 38, south: 55, north: 56 } })).toEqual(['want']);
  });

  it('сортировка: без значения — в конце', () => {
    expect(ids(sortPlaces(items, 'rating'))).toEqual(['fav', 'old', 'meh', 'want']);
    expect(ids(sortPlaces(items, 'recent'))).toEqual(['fav', 'meh', 'old', 'want']);
    expect(ids(sortPlaces(items, 'visits'))).toEqual(['fav', 'meh', 'old', 'want']);
    expect(ids(sortPlaces(items, 'spent'))).toEqual(['fav', 'meh', 'old', 'want']);
  });

  it('вид маркера', () => {
    expect(items.map(markerKind)).toEqual(['favorite', 'visited', 'want', 'visited']);
  });
});

describe('рекомендации', () => {
  it('формула: 0,4 × впечатление + 0,4 × вернуться + 0,2 × давность', () => {
    const s = placeStats([rated('a', '2026-04-23', 8, 9, 9, 9)], TODAY);
    // 180 дней → давность 10: 8.5 × 0.4 + 9 × 0.4 + 10 × 0.2
    expect(recommendationScore(s)).toBeCloseTo(9);
  });

  it('советует любимые места, где давно не были, и объясняет почему', () => {
    const items = buildPlaceItems(
      [place('stereobar'), place('recent'), place('bad'), place('mid')],
      [
        rated('stereobar', '2026-06-14', 8, 9, 9, 9),
        rated('recent', '2026-10-15', 10, 10),
        rated('bad', '2026-01-10', 4, 5),
        rated('mid', '2026-08-01', 7, 8, 8, 8),
      ],
      TODAY,
    );
    const recs = recommendations(items);
    expect(recs.map((r) => r.item.place.id)).toEqual(['stereobar', 'mid']);
    expect(recs[0]!.reason).toBe('Вы оба оценили место высоко, но давно здесь не были.');
    expect(recs[1]!.reason).toBe('Вам обоим хочется сюда вернуться.');
  });
});

describe('osmUrl', () => {
  it('строит ссылку на объект OSM', () => {
    expect(osmUrl('N123')).toBe('https://www.openstreetmap.org/node/123');
    expect(osmUrl('R69424')).toBe('https://www.openstreetmap.org/relation/69424');
    expect(osmUrl('X1')).toBeNull();
  });
});

describe('searchSaved', () => {
  it('ищет по названию и адресу без учёта регистра, ё = е', () => {
    const items = buildPlaceItems(
      [place('Ёлка'), place('Бар', { address: 'Невский проспект, 1' })],
      [],
      TODAY,
    );
    expect(searchSaved(items, 'елк').map((i) => i.place.id)).toEqual(['Ёлка']);
    expect(searchSaved(items, 'невский').map((i) => i.place.id)).toEqual(['Бар']);
    expect(searchSaved(items, '  ')).toEqual([]);
  });
});

describe('mainCluster', () => {
  it('отбрасывает далёкие точки для первого показа карты', () => {
    const spb = (lat: number) => ({ latitude: lat, longitude: 30.3 });
    const moscow = { latitude: 55.75, longitude: 37.6 };
    expect(mainCluster([spb(59.93), spb(59.94), spb(59.92), moscow])).toEqual([
      spb(59.93),
      spb(59.94),
      spb(59.92),
    ]);
    expect(mainCluster([spb(59.93), moscow])).toHaveLength(2);
  });
});
