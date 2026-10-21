import { describe, expect, it } from 'vitest';
import { categoryFromOsm, parseNominatimDetails, parsePhotonResponse } from './osm';

describe('Photon', () => {
  it('разбирает место: id OSM, адрес, город, категория', () => {
    const [c] = parsePhotonResponse({
      features: [
        {
          properties: {
            osm_type: 'R',
            osm_id: 69424,
            osm_key: 'historic',
            osm_value: 'castle',
            name: 'Зимний дворец',
            street: 'Дворцовая набережная',
            housenumber: '38 литА',
            city: 'Санкт-Петербург',
            country: 'Россия',
          },
          geometry: { type: 'Point', coordinates: [30.3151887, 59.9404625] },
        },
      ],
    });
    expect(c).toEqual({
      providerPlaceId: 'R69424',
      name: 'Зимний дворец',
      address: 'Дворцовая набережная, 38 литА',
      city: 'Санкт-Петербург',
      latitude: 59.9404625,
      longitude: 30.3151887,
      category: 'entertainment',
    });
  });

  it('без названия берёт адрес, без города — район/регион; пропускает мусор и дубли', () => {
    const f = (props: object, coordinates: unknown = [30, 60]) => ({
      properties: props,
      geometry: { coordinates },
    });
    const list = parsePhotonResponse({
      features: [
        f({
          osm_type: 'W',
          osm_id: 1,
          street: 'Невский проспект',
          housenumber: '1',
          county: 'Всеволожский район',
        }),
        f({ osm_type: 'W', osm_id: 1, street: 'Невский проспект', housenumber: '1' }),
        f({ osm_type: 'N', osm_id: 2 }),
        f({ osm_type: 'N', osm_id: 3, name: 'Без координат' }, null),
        f({ osm_type: 'X', osm_id: 4, name: 'Странный тип' }),
      ],
    });
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      providerPlaceId: 'W1',
      name: 'Невский проспект, 1',
      city: 'Всеволожский район',
      category: 'other',
    });
    expect(parsePhotonResponse({ message: 'error' })).toEqual([]);
  });

  it('категории по тегам OSM', () => {
    expect(categoryFromOsm('amenity', 'cafe')).toBe('cafe');
    expect(categoryFromOsm('amenity', 'pub')).toBe('bar');
    expect(categoryFromOsm('shop', 'books')).toBe('shop');
    expect(categoryFromOsm('leisure', 'park')).toBe('park');
    expect(categoryFromOsm('tourism', 'museum')).toBe('museum');
    expect(categoryFromOsm('amenity', 'bank')).toBe('other');
    expect(categoryFromOsm(undefined, undefined)).toBe('other');
  });
});

describe('Nominatim', () => {
  it('берёт сайт и часы работы из extratags, небезопасные ссылки отбрасывает', () => {
    expect(
      parseNominatimDetails([
        { extratags: { website: 'ermitazh.org', opening_hours: 'Tu-Su 10:30-18:00' } },
      ]),
    ).toEqual({ website: 'https://ermitazh.org/', openingHours: 'Tu-Su 10:30-18:00' });
    expect(parseNominatimDetails([{ extratags: { website: 'javascript:alert(1)' } }])).toEqual({
      website: null,
      openingHours: null,
    });
    expect(parseNominatimDetails([{ extratags: null }])).toEqual({
      website: null,
      openingHours: null,
    });
    expect(parseNominatimDetails([])).toBeNull();
  });
});
