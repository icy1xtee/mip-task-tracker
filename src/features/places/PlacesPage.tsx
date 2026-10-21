import { lazy, Suspense, useMemo, useState } from 'react';
import { usePageChrome } from '@/components/layout/chrome';
import { Button } from '@/components/ui/Button';
import { Chips, Segmented, type ChoiceOption } from '@/components/ui/Choice';
import { cx } from '@/components/ui/cx';
import { Field, Select } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataView, EmptyState, LoadingState } from '@/components/ui/States';
import { useConfirmDelete } from '@/components/ui/useConfirmDelete';
import { combine } from '@/lib/firebase/db';
import { todayIsoDate } from '@/lib/format/dates';
import type { PlaceCategory, PlaceVisit } from '@/types/models';
import { deletePlace, deleteVisit, usePlaces, usePlaceVisits } from './api';
import { reverseGeocode, type LatLng, type PlaceCandidate } from './osm';
import type { PlaceDraft } from './placeForms';
import { PlaceForm } from './PlaceForm';
import { PLACE_CATEGORIES } from './placeMeta';
import type { MapFocus, MapPoint, MapView } from './PlacesMap';
import { PlacePeek, ReturnRecommendations } from './PlacePeek';
import { PlaceRow } from './PlaceRow';
import { PlaceSearch } from './PlaceSearch';
import { PlaceSheet } from './PlaceSheet';
import {
  buildPlaceItems,
  cityOptions,
  extraFilterCount,
  filterPlaces,
  markerKind,
  matchesView,
  NO_FILTERS,
  PLACE_SORTS,
  PLACE_VIEWS,
  placeDeleteCopy,
  placesLead,
  recommendations,
  sortPlaces,
  visitDeleteCopy,
  type PlaceFilters,
  type PlaceItem,
  type PlaceSort,
  type PlaceView,
} from './placesView';
import { VisitForm } from './VisitForm';

// MapLibre — самая тяжёлая зависимость приложения: грузится только на этой странице.
const PlacesMap = lazy(() => import('./PlacesMap').then((m) => ({ default: m.PlacesMap })));

type Mode = 'map' | 'list';
type FormState =
  | { kind: 'place'; draft: PlaceDraft | null; placeId: string | null }
  | { kind: 'visit'; placeId: string; visit: PlaceVisit | null };

/** Сколько ждать адрес для ручной точки, прежде чем открыть форму без него. */
const REVERSE_TIMEOUT_MS = 4000;

const MIN_RATINGS = [
  { value: 0, label: 'Любая' },
  { value: 7, label: 'От 7' },
  { value: 8, label: 'От 8' },
  { value: 9, label: 'От 9' },
];

export function PlacesPage() {
  const places = usePlaces();
  const visits = usePlaceVisits();
  const state = combine(places, visits);
  const today = todayIsoDate();
  const items = useMemo(
    () => buildPlaceItems(places.data, visits.data, today),
    [places.data, visits.data, today],
  );
  const byId = useMemo(() => new Map(items.map((i) => [i.place.id, i])), [items]);

  const [mode, setMode] = useState<Mode>('map');
  const [filters, setFilters] = useState<Omit<PlaceFilters, 'bounds'>>(NO_FILTERS);
  const [nearOnly, setNearOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState<PlaceSort>('rating');
  const [mapView, setMapView] = useState<MapView | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [picking, setPicking] = useState(false);
  const [locating, setLocating] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);

  const lead = state.status === 'ready' ? placesLead(items) : '';
  const startPicking = () => {
    setForm(null);
    setSelectedId(null);
    setMode('map');
    setPicking(true);
  };
  usePageChrome({ title: 'Места', sub: lead, addLabel: 'Поставить точку' }, startPicking);

  const del = useConfirmDelete<PlaceItem>({
    ...placeDeleteCopy,
    remove: (i) =>
      deletePlace(
        i.place.id,
        i.stats.visits.map((v) => v.id),
      ),
    doneMessage: 'Место удалено',
    onDone: () => {
      setSheetId(null);
      setSelectedId(null);
    },
  });
  const delVisit = useConfirmDelete<PlaceVisit>({
    ...visitDeleteCopy,
    remove: (v) => deleteVisit(v.id),
    doneMessage: 'Посещение удалено',
  });

  const fullFilters: PlaceFilters = {
    ...filters,
    bounds: nearOnly ? (mapView?.bounds ?? null) : null,
  };
  const list = sortPlaces(filterPlaces(items, fullFilters), sort);
  // На карте — те же фильтры, кроме «видимой области»: она и так про карту.
  const points = useMemo<MapPoint[]>(
    () =>
      filterPlaces(items, { ...filters, bounds: null }).map((i) => ({
        id: i.place.id,
        name: i.place.name,
        latitude: i.place.latitude,
        longitude: i.place.longitude,
        kind: markerKind(i),
      })),
    [items, filters],
  );
  const recs = useMemo(() => recommendations(items), [items]);
  const cities = cityOptions(items);
  const extraCount = extraFilterCount({ ...filters, bounds: null }) + Number(nearOnly);

  const focusOn = (at: LatLng, aside = false) =>
    setFocus((f) => ({ at, aside, seq: (f?.seq ?? 0) + 1 }));
  const showPlace = (id: string, openSheet: boolean) => {
    const item = byId.get(id);
    if (!item) return;
    setPicking(false);
    setSelectedId(id);
    focusOn({ lat: item.place.latitude, lng: item.place.longitude }, openSheet);
    if (openSheet) setSheetId(id);
    else setMode('map');
  };

  const addCandidate = (c: PlaceCandidate) => {
    setPicking(false);
    setSelectedId(null);
    setMode('map');
    focusOn({ lat: c.latitude, lng: c.longitude }, true);
    setForm({ kind: 'place', placeId: null, draft: { provider: 'osm', ...c } });
  };

  const addManual = async (at: LatLng) => {
    setPicking(false);
    setLocating(true);
    const where = await reverseGeocode(at, AbortSignal.timeout(REVERSE_TIMEOUT_MS));
    setLocating(false);
    setForm({
      kind: 'place',
      placeId: null,
      draft: {
        provider: 'manual',
        providerPlaceId: null,
        name: '',
        address: where?.address ?? null,
        city: where?.city ?? null,
        latitude: at.lat,
        longitude: at.lng,
        category: 'other',
      },
    });
  };

  const setView = (view: PlaceView) => setFilters((f) => ({ ...f, view }));
  const resetFilters = () => {
    setFilters(NO_FILTERS);
    setNearOnly(false);
  };

  const viewChips: ChoiceOption<PlaceView>[] = PLACE_VIEWS.flatMap((v) => {
    const count = items.filter((i) => matchesView(i, v.value)).length;
    const basic = v.value === 'all' || v.value === 'visited' || v.value === 'want';
    return basic || count || filters.view === v.value ? [{ ...v, count }] : [];
  });

  const sheetItem = sheetId ? byId.get(sheetId) : undefined;
  const peekItem = selectedId ? byId.get(selectedId) : undefined;
  const formItem = form?.placeId ? byId.get(form.placeId) : undefined;
  const draft = form?.kind === 'place' && form.draft ? form.draft : null;
  const draftAt = useMemo(
    () => (draft ? { lat: draft.latitude, lng: draft.longitude } : null),
    [draft],
  );

  return (
    <div className="page page-places">
      <PageHeader
        eyebrow="Для двоих"
        title="Места"
        lead={lead || undefined}
        actions={
          <Button icon="pin" onClick={startPicking}>
            Поставить точку
          </Button>
        }
      />
      <DataView state={state}>
        {() => (
          <>
            <div className="places-bar">
              <PlaceSearch
                items={items}
                near={mapView?.center ?? null}
                onPickSaved={(id) => showPlace(id, false)}
                onPickCandidate={addCandidate}
                onManual={startPicking}
              />
              <div className="places-mode">
                <Segmented<Mode>
                  full
                  ariaLabel="Вид"
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: 'map', label: 'Карта' },
                    { value: 'list', label: 'Список', count: list.length },
                  ]}
                />
              </div>
            </div>

            <div className={cx('places', `is-${mode}`)}>
              <div className="places-side">
                <Chips<PlaceView>
                  ariaLabel="Какие места показать"
                  value={filters.view}
                  onChange={setView}
                  options={viewChips}
                />
                <div className="places-tools">
                  <Select
                    aria-label="Сортировка"
                    value={sort}
                    onChange={(e) => setSort(e.target.value as PlaceSort)}
                  >
                    {PLACE_SORTS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </Select>
                  <Button
                    variant={extraCount ? 'primary' : 'secondary'}
                    icon="filter"
                    aria-expanded={showFilters}
                    onClick={() => setShowFilters((v) => !v)}
                  >
                    Фильтры{extraCount ? ` · ${extraCount}` : ''}
                  </Button>
                </div>
                {showFilters && (
                  <div className="places-filters">
                    <div className="row2">
                      <Field label="Категория">
                        {(p) => (
                          <Select
                            {...p}
                            value={filters.category}
                            onChange={(e) =>
                              setFilters((f) => ({
                                ...f,
                                category: e.target.value as PlaceCategory | 'all',
                              }))
                            }
                          >
                            <option value="all">Все</option>
                            {PLACE_CATEGORIES.map((c) => (
                              <option key={c.value} value={c.value}>
                                {c.label}
                              </option>
                            ))}
                          </Select>
                        )}
                      </Field>
                      <Field label="Оценка">
                        {(p) => (
                          <Select
                            {...p}
                            value={filters.minRating}
                            onChange={(e) =>
                              setFilters((f) => ({ ...f, minRating: Number(e.target.value) }))
                            }
                          >
                            {MIN_RATINGS.map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.label}
                              </option>
                            ))}
                          </Select>
                        )}
                      </Field>
                    </div>
                    {cities.length > 1 && (
                      <Field label="Город">
                        {(p) => (
                          <Select
                            {...p}
                            value={filters.city}
                            onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
                          >
                            <option value="all">Все</option>
                            {cities.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </Select>
                        )}
                      </Field>
                    )}
                    <label className="inline-check">
                      <input
                        type="checkbox"
                        checked={nearOnly}
                        onChange={(e) => setNearOnly(e.target.checked)}
                      />
                      Рядом: только то, что видно на карте
                    </label>
                    {extraCount > 0 && (
                      <button type="button" className="textlink" onClick={resetFilters}>
                        <Icon name="x" />
                        Сбросить фильтры
                      </button>
                    )}
                  </div>
                )}

                {filters.view === 'all' && extraCount === 0 && recs.length > 0 && (
                  <ReturnRecommendations
                    recs={recs}
                    today={today}
                    onOpen={(id) => showPlace(id, true)}
                  />
                )}

                {list.length > 0 ? (
                  <div className="list">
                    {list.map((i) => (
                      <PlaceRow
                        key={i.place.id}
                        item={i}
                        today={today}
                        selected={i.place.id === selectedId}
                        onOpen={() => showPlace(i.place.id, true)}
                      />
                    ))}
                  </div>
                ) : items.length > 0 ? (
                  <EmptyState
                    icon="filter"
                    text="Под эти фильтры ничего не подходит."
                    action={
                      <Button
                        variant="secondary"
                        onClick={() => {
                          resetFilters();
                          setView('all');
                        }}
                      >
                        Показать все места
                      </Button>
                    }
                  />
                ) : (
                  <EmptyState
                    icon="pin"
                    text="Здесь будет ваша карта: где были, как понравилось и куда хочется. Найдите место через поиск или поставьте точку."
                    action={
                      <Button icon="pin" onClick={startPicking}>
                        Поставить точку
                      </Button>
                    }
                  />
                )}
              </div>

              <div className="places-map">
                <Suspense fallback={<LoadingState label="Загружаем карту…" />}>
                  <PlacesMap
                    points={points}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    picking={picking}
                    onPick={(at) => void addManual(at)}
                    draft={draftAt}
                    focus={focus}
                    onView={setMapView}
                  />
                </Suspense>
                {picking || locating ? (
                  <div className="pmap-banner" role="status">
                    {locating ? (
                      <>
                        <span className="spinner is-dark" aria-hidden="true" />
                        Определяем адрес…
                      </>
                    ) : (
                      <>
                        <Icon name="pin" />
                        <span className="pmap-banner-text">
                          Нажмите на карту, где находится место
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => setPicking(false)}>
                          Отмена
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="pmap-legend" aria-hidden="true">
                    <span>
                      <span className="pdot pdot-visited" />
                      Были
                    </span>
                    <span>
                      <span className="pdot pdot-want" />
                      Хотим
                    </span>
                    <span>
                      <span className="pdot pdot-favorite" />
                      Любимые
                    </span>
                  </div>
                )}
                {peekItem && !picking && (
                  <PlacePeek
                    item={peekItem}
                    today={today}
                    onOpen={() => setSheetId(peekItem.place.id)}
                    onClose={() => setSelectedId(null)}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </DataView>

      {sheetItem && (
        <PlaceSheet
          item={sheetItem}
          today={today}
          open={!form && !del.isOpen && !delVisit.isOpen}
          onClose={() => setSheetId(null)}
          onEdit={() => setForm({ kind: 'place', placeId: sheetItem.place.id, draft: null })}
          onDelete={() => del.ask(sheetItem)}
          onAddVisit={() => setForm({ kind: 'visit', placeId: sheetItem.place.id, visit: null })}
          onEditVisit={(visit) => setForm({ kind: 'visit', placeId: sheetItem.place.id, visit })}
          onDeleteVisit={delVisit.ask}
        />
      )}
      {form?.kind === 'place' && (form.draft || formItem) && (
        <PlaceForm
          draft={form.draft}
          item={formItem ?? null}
          onClose={() => setForm(null)}
          onSaved={(id) => setSelectedId(id)}
        />
      )}
      {form?.kind === 'visit' && formItem && (
        <VisitForm place={formItem.place} visit={form.visit} onClose={() => setForm(null)} />
      )}
      {del.dialog}
      {delVisit.dialog}
    </div>
  );
}
