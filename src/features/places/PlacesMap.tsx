import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import {
  GeolocateControl,
  Map as MapLibre,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
} from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import type { LatLng } from './osm';
import { mainCluster, type MapBounds, type MarkerKind } from './placesView';

// Worker MapLibre ищет рядом со своим модулем — после сборки Vite его путь нужно указать явно.
setWorkerUrl(workerUrl);

/** Векторные тайлы OpenFreeMap: бесплатно, без ключа. Positron — спокойная светлая подложка. */
const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
/** Петербург — пока на карте нет ни одного места. */
const DEFAULT_CENTER: [number, number] = [30.3158, 59.9391];
const DEFAULT_ZOOM = 10;
const FOCUS_ZOOM = 15;
/** Радиус попадания по точке: маркер маленький, а палец — нет. */
const HIT_PX = 14;

export type MapPoint = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  kind: MarkerKind;
};

export type MapView = { bounds: MapBounds; center: LatLng };

/** aside — справа откроется боковая панель (форма): точку надо показать левее неё. */
export type MapFocus = { at: LatLng; seq: number; aside: boolean };

/** Ширина боковой панели .panel на desktop/планшете. */
const PANEL_WIDTH = 448;

type PlacesMapProps = {
  points: MapPoint[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Режим «поставить точку»: клик по карте отдаёт координаты, маркеры не выбираются. */
  picking: boolean;
  onPick: (at: LatLng) => void;
  /** Временный маркер нового места (выбранный результат поиска или ручная точка). */
  draft: LatLng | null;
  /** Запрос «показать точку»: seq меняется при каждом новом запросе. */
  focus: MapFocus | null;
  onView: (view: MapView) => void;
};

function canUseWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Тип данных источника GeoJSON — из самой MapLibre, без отдельной зависимости @types/geojson. */
type SourceData = Exclude<Parameters<GeoJSONSource['setData']>[0], string>;

function toGeoJson(points: MapPoint[]): SourceData {
  return {
    type: 'FeatureCollection',
    features: points.map((p) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
      properties: { id: p.id, name: p.name, kind: p.kind },
    })),
  };
}

/** Подписи подложки — по-русски, если перевод есть (в стиле по умолчанию латиница + оригинал). */
function localizeLabels(map: MapLibre) {
  for (const layer of map.getStyle().layers) {
    if (layer.type !== 'symbol') continue;
    const field = map.getLayoutProperty(layer.id, 'text-field');
    if (field && JSON.stringify(field).includes('"name')) {
      map.setLayoutProperty(layer.id, 'text-field', [
        'coalesce',
        ['get', 'name:ru'],
        ['get', 'name'],
      ]);
    }
  }
}

export function PlacesMap(props: PlacesMapProps) {
  const [supported] = useState(canUseWebGL);
  if (!supported) {
    return (
      <div className="pmap pmap-fallback" role="status">
        Браузер не поддерживает карту (нужен WebGL). Список мест работает как обычно.
      </div>
    );
  }
  return <MapCanvas {...props} />;
}

function MapCanvas({
  points,
  selectedId,
  onSelect,
  picking,
  onPick,
  draft,
  focus,
  onView,
}: PlacesMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibre | null>(null);
  const fittedRef = useRef(false);
  const [ready, setReady] = useState(false);
  // Обработчики событий карты читают актуальные пропсы без пересоздания карты.
  const latest = useRef({ onSelect, onPick, onView, picking });
  useEffect(() => {
    latest.current = { onSelect, onPick, onView, picking };
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const css = getComputedStyle(container);
    const token = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
    const accent = token('--accent', '#ba1748');
    const surface = token('--surface', '#fbfaf6');
    const ink = token('--ink', '#22241f');

    const map = new MapLibre({
      container,
      style: STYLE_URL,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      maxZoom: 19,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });
    mapRef.current = map;
    map.touchZoomRotate.disableRotation();
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(
      new GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        showAccuracyCircle: false,
      }),
      'top-right',
    );

    const report = () => {
      const b = map.getBounds();
      const c = map.getCenter();
      latest.current.onView({
        bounds: { west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() },
        center: { lat: c.lat, lng: c.lng },
      });
    };

    map.on('load', () => {
      localizeLabels(map);
      // Кластеризация — встроенная в источник GeoJSON MapLibre.
      map.addSource('places', {
        type: 'geojson',
        data: toGeoJson([]),
        cluster: true,
        clusterRadius: 44,
        clusterMaxZoom: 14,
      });
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'places',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': accent,
          'circle-opacity': 0.92,
          'circle-radius': ['step', ['get', 'point_count'], 15, 10, 19, 30, 23],
          'circle-stroke-width': 3,
          'circle-stroke-color': surface,
        },
      });
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'places',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['Noto Sans Bold'],
          'text-size': 12,
          'text-allow-overlap': true,
        },
        paint: { 'text-color': '#ffffff' },
      });
      map.addLayer({
        id: 'place-selected',
        type: 'circle',
        source: 'places',
        filter: ['==', ['get', 'id'], ''],
        paint: { 'circle-radius': 17, 'circle-color': accent, 'circle-opacity': 0.2 },
      });
      // Были — заливка акцентом, хотим — пустое кольцо, любимые — крупнее. Без лишних цветов.
      map.addLayer({
        id: 'place-points',
        type: 'circle',
        source: 'places',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': ['match', ['get', 'kind'], 'favorite', 9, 'want', 6, 7],
          'circle-color': ['match', ['get', 'kind'], 'want', surface, accent],
          'circle-stroke-color': ['match', ['get', 'kind'], 'want', accent, surface],
          'circle-stroke-width': ['match', ['get', 'kind'], 'favorite', 3, 2.5],
        },
      });
      map.addLayer({
        id: 'place-labels',
        type: 'symbol',
        source: 'places',
        filter: ['!', ['has', 'point_count']],
        minzoom: 12.5,
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 12,
          'text-anchor': 'top',
          'text-offset': [0, 1],
          'text-max-width': 9,
          'text-optional': true,
        },
        paint: { 'text-color': ink, 'text-halo-color': surface, 'text-halo-width': 1.5 },
      });
      setReady(true);
      report();
    });

    map.on('moveend', report);

    map.on('click', (e) => {
      const { picking, onPick, onSelect } = latest.current;
      if (picking) {
        onPick({ lat: e.lngLat.lat, lng: e.lngLat.lng });
        return;
      }
      const { x, y } = e.point;
      const hits = map.queryRenderedFeatures(
        [
          [x - HIT_PX, y - HIT_PX],
          [x + HIT_PX, y + HIT_PX],
        ],
        { layers: ['place-points', 'clusters'] },
      );
      const point = hits.find((f) => f.layer.id === 'place-points');
      const cluster = hits.find((f) => f.layer.id === 'clusters');
      if (point && typeof point.properties.id === 'string') {
        onSelect(point.properties.id);
      } else if (cluster && cluster.geometry.type === 'Point') {
        const center = cluster.geometry.coordinates as [number, number];
        map
          .getSource<GeoJSONSource>('places')
          ?.getClusterExpansionZoom(cluster.properties.cluster_id as number)
          .then((zoom) => map.easeTo({ center, zoom }))
          .catch(() => {});
      } else {
        onSelect(null);
      }
    });

    for (const layer of ['place-points', 'clusters']) {
      map.on('mouseenter', layer, () => {
        if (!latest.current.picking) map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', layer, () => {
        if (!latest.current.picking) map.getCanvas().style.cursor = '';
      });
    }

    // Карта меняет размер не только с окном: переключение «Карта / Список», сайдбар.
    const resize = new ResizeObserver(() => map.resize());
    resize.observe(container);

    return () => {
      resize.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.getSource<GeoJSONSource>('places')?.setData(toGeoJson(points));
    if (!fittedRef.current) {
      fittedRef.current = true;
      const main = mainCluster(points);
      if (main.length === 1) {
        map.jumpTo({ center: [main[0]!.longitude, main[0]!.latitude], zoom: 13 });
      } else if (main.length > 1) {
        const lats = main.map((p) => p.latitude);
        const lngs = main.map((p) => p.longitude);
        map.fitBounds(
          [
            [Math.min(...lngs), Math.min(...lats)],
            [Math.max(...lngs), Math.max(...lats)],
          ],
          { padding: 56, maxZoom: 14, duration: 0 },
        );
      }
    }
  }, [points, ready]);

  useEffect(() => {
    if (!ready) return;
    mapRef.current?.setFilter('place-selected', ['==', ['get', 'id'], selectedId ?? '']);
  }, [selectedId, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = picking ? 'crosshair' : '';
  }, [picking]);

  const focusSeq = focus?.seq;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus) return;
    // Bottom sheet на телефоне перекрывает всё, на широком экране панель — только правый край.
    const rect = map.getContainer().getBoundingClientRect();
    const covered = Math.max(0, rect.right - (window.innerWidth - PANEL_WIDTH));
    const right =
      focus.aside && window.innerWidth >= 700 && rect.width - covered > 200 ? covered : 0;
    map.flyTo({
      center: [focus.at.lng, focus.at.lat],
      zoom: Math.max(map.getZoom(), FOCUS_ZOOM),
      padding: { top: 0, bottom: 0, left: 0, right },
      essential: true,
    });
  }, [focusSeq]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !draft) return;
    const accent = getComputedStyle(map.getContainer()).getPropertyValue('--accent').trim();
    const marker = new Marker({ color: accent || '#ba1748' })
      .setLngLat([draft.lng, draft.lat])
      .addTo(map);
    return () => {
      marker.remove();
    };
  }, [draft]);

  return <div className="pmap" ref={containerRef} aria-label="Карта мест" role="region" />;
}
