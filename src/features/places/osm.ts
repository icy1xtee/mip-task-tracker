import { normalizeUrl } from '@/lib/format/url';
import type { PlaceCategory } from '@/types/models';

/**
 * Внешние данные OpenStreetMap — без ключей и без своей базы заведений:
 * поиск и обратное геокодирование — Photon (komoot), подробности по id — Nominatim.
 * В Firestore попадает только то, что нужно для карты; остальное запрашивается по providerPlaceId.
 */

const PHOTON = 'https://photon.komoot.io';
const NOMINATIM = 'https://nominatim.openstreetmap.org';

export type PlaceCandidate = {
  providerPlaceId: string;
  name: string;
  address: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  category: PlaceCategory;
};

/** Тег OSM → категория. Ключ «key=value» или «key=*» для всего ключа. */
const OSM_CATEGORY: Record<string, PlaceCategory> = {
  'amenity=restaurant': 'restaurant',
  'amenity=fast_food': 'restaurant',
  'amenity=food_court': 'restaurant',
  'amenity=cafe': 'cafe',
  'amenity=ice_cream': 'cafe',
  'shop=coffee': 'cafe',
  'shop=bakery': 'cafe',
  'amenity=bar': 'bar',
  'amenity=pub': 'bar',
  'amenity=biergarten': 'bar',
  'amenity=nightclub': 'bar',
  'amenity=cinema': 'cinema',
  'tourism=museum': 'museum',
  'tourism=gallery': 'museum',
  'amenity=arts_centre': 'museum',
  'leisure=park': 'park',
  'leisure=garden': 'park',
  'leisure=nature_reserve': 'park',
  'boundary=national_park': 'park',
  'shop=*': 'shop',
  'amenity=theatre': 'entertainment',
  'amenity=concert_hall': 'entertainment',
  'tourism=attraction': 'entertainment',
  'tourism=viewpoint': 'entertainment',
  'tourism=theme_park': 'entertainment',
  'tourism=zoo': 'entertainment',
  'tourism=aquarium': 'entertainment',
  'historic=*': 'entertainment',
  'leisure=*': 'entertainment',
};

export function categoryFromOsm(key: string | undefined, value: string | undefined): PlaceCategory {
  if (!key) return 'other';
  return OSM_CATEGORY[`${key}=${value}`] ?? OSM_CATEGORY[`${key}=*`] ?? 'other';
}

type PhotonProps = Partial<
  Record<
    | 'osm_type'
    | 'osm_key'
    | 'osm_value'
    | 'name'
    | 'street'
    | 'housenumber'
    | 'city'
    | 'county'
    | 'state'
    | 'district',
    string
  >
> & { osm_id?: number };

type PhotonFeature = {
  properties?: PhotonProps;
  geometry?: { type?: string; coordinates?: unknown };
};

const nonEmpty = (v: string | undefined): string | null => (v && v.trim() ? v.trim() : null);

/** «Дворцовая набережная, 38». */
export function photonAddress(p: PhotonProps): string | null {
  const street = nonEmpty(p.street);
  if (!street) return null;
  const house = nonEmpty(p.housenumber);
  return house ? `${street}, ${house}` : street;
}

export function photonCity(p: PhotonProps): string | null {
  return nonEmpty(p.city) ?? nonEmpty(p.county) ?? nonEmpty(p.state);
}

export function parsePhotonFeature(f: PhotonFeature): PlaceCandidate | null {
  const p = f.properties;
  const coords = f.geometry?.coordinates;
  if (!p || !Array.isArray(coords)) return null;
  const [lng, lat] = coords;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (!p.osm_type || !/^[NWR]$/.test(p.osm_type) || !Number.isSafeInteger(p.osm_id)) return null;
  const address = photonAddress(p);
  const name = nonEmpty(p.name) ?? address;
  if (!name) return null;
  return {
    providerPlaceId: `${p.osm_type}${p.osm_id}`,
    name: name.slice(0, 200),
    address: address?.slice(0, 300) ?? null,
    city: photonCity(p)?.slice(0, 100) ?? null,
    latitude: lat,
    longitude: lng,
    category: categoryFromOsm(p.osm_key, p.osm_value),
  };
}

export function parsePhotonResponse(json: unknown): PlaceCandidate[] {
  const features = (json as { features?: unknown })?.features;
  if (!Array.isArray(features)) return [];
  const seen = new Set<string>();
  const result: PlaceCandidate[] = [];
  for (const f of features) {
    const c = parsePhotonFeature(f as PhotonFeature);
    if (!c || seen.has(c.providerPlaceId)) continue;
    seen.add(c.providerPlaceId);
    result.push(c);
  }
  return result;
}

async function getJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export type LatLng = { lat: number; lng: number };

/** Поиск мест; near — центр карты, чтобы сначала шли места рядом. */
export async function searchPlaces(
  query: string,
  near: LatLng | null,
  signal?: AbortSignal,
): Promise<PlaceCandidate[]> {
  // lang=default — местные названия (в России — по-русски), а не язык браузера.
  const params = new URLSearchParams({ q: query, limit: '8', lang: 'default' });
  if (near) {
    params.set('lat', near.lat.toFixed(4));
    params.set('lon', near.lng.toFixed(4));
  }
  return parsePhotonResponse(await getJson(`${PHOTON}/api/?${params}`, signal));
}

/** Адрес и город для ручной точки. Ошибка сети — не повод не дать поставить точку: вернём null. */
export async function reverseGeocode(
  at: LatLng,
  signal?: AbortSignal,
): Promise<{ address: string | null; city: string | null } | null> {
  try {
    const params = new URLSearchParams({
      lat: at.lat.toFixed(6),
      lon: at.lng.toFixed(6),
      limit: '1',
      lang: 'default',
    });
    const json = (await getJson(`${PHOTON}/reverse?${params}`, signal)) as {
      features?: PhotonFeature[];
    };
    const p = json.features?.[0]?.properties;
    return p ? { address: photonAddress(p), city: photonCity(p) } : null;
  } catch {
    return null;
  }
}

export type OsmDetails = { website: string | null; openingHours: string | null };

export function parseNominatimDetails(json: unknown): OsmDetails | null {
  const first = Array.isArray(json) ? (json[0] as { extratags?: unknown } | undefined) : undefined;
  const tags = first?.extratags;
  if (!tags || typeof tags !== 'object')
    return first ? { website: null, openingHours: null } : null;
  const t = tags as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  const site = str(t.website) ?? str(t['contact:website']) ?? str(t.url);
  return {
    website: site ? normalizeUrl(site) : null,
    openingHours: str(t.opening_hours),
  };
}

const detailsCache = new Map<string, Promise<OsmDetails | null>>();

/** Актуальные сайт и часы работы по id OSM — не храним у себя, кэшируем на время сессии. */
export function fetchOsmDetails(providerPlaceId: string): Promise<OsmDetails | null> {
  let pending = detailsCache.get(providerPlaceId);
  if (!pending) {
    const params = new URLSearchParams({
      osm_ids: providerPlaceId,
      format: 'jsonv2',
      extratags: '1',
      addressdetails: '0',
    });
    pending = getJson(`${NOMINATIM}/lookup?${params}`)
      .then(parseNominatimDetails)
      .catch(() => {
        detailsCache.delete(providerPlaceId);
        return null;
      });
    detailsCache.set(providerPlaceId, pending);
  }
  return pending;
}
