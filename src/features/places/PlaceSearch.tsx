import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { cx } from '@/components/ui/cx';
import { Icon } from '@/components/ui/Icon';
import type { LatLng, PlaceCandidate } from './osm';
import { categoryLabel, STATUS_LABEL } from './placeMeta';
import { searchSaved, type PlaceItem } from './placesView';
import { usePlaceSearch } from './usePlaceSearch';

type Option =
  | { kind: 'saved'; key: string; item: PlaceItem }
  | { kind: 'new'; key: string; candidate: PlaceCandidate };

type PlaceSearchProps = {
  items: PlaceItem[];
  near: LatLng | null;
  onPickSaved: (placeId: string) => void;
  onPickCandidate: (candidate: PlaceCandidate) => void;
  onManual: () => void;
};

const meta = (...parts: (string | null)[]) => parts.filter(Boolean).join(' · ');

/** Поиск: сначала свои места, затем реальные места из OpenStreetMap (Photon). */
export function PlaceSearch({
  items,
  near,
  onPickSaved,
  onPickCandidate,
  onManual,
}: PlaceSearchProps) {
  const listId = useId();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const search = usePlaceSearch(open ? q : '', near);

  const byOsmId = useMemo(() => {
    const map = new Map<string, PlaceItem>();
    for (const i of items) if (i.place.providerPlaceId) map.set(i.place.providerPlaceId, i);
    return map;
  }, [items]);

  const saved = searchSaved(items, q);
  const options: Option[] = saved.map((item) => ({ kind: 'saved', key: item.place.id, item }));
  for (const c of search.results) {
    const existing = byOsmId.get(c.providerPlaceId);
    if (existing && saved.includes(existing)) continue;
    options.push(
      existing
        ? { kind: 'saved', key: existing.place.id, item: existing }
        : { kind: 'new', key: c.providerPlaceId, candidate: c },
    );
  }
  const firstNew = options.findIndex((o) => o.kind === 'new');
  const current = Math.min(active, options.length - 1);
  const shown = open && q.trim() !== '';

  const pick = (o: Option) => {
    setQ('');
    setOpen(false);
    if (o.kind === 'saved') onPickSaved(o.item.place.id);
    else onPickCandidate(o.candidate);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      if (options.length)
        setActive((current + (e.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length);
    } else if (e.key === 'Enter' && shown && options[current]) {
      e.preventDefault();
      pick(options[current]);
    } else if (e.key === 'Escape') {
      if (shown) e.stopPropagation();
      setOpen(false);
    }
  };

  return (
    <div className="psearch">
      <div className="search-wrap">
        <Icon name="search" />
        <input
          type="search"
          className="input"
          placeholder="Найти место: кафе, музей, адрес…"
          aria-label="Найти место"
          role="combobox"
          aria-expanded={shown}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={shown && options[current] ? `${listId}-${current}` : undefined}
          autoComplete="off"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
      </div>
      {shown && (
        // mousedown не забирает фокус у поля — иначе список закроется раньше клика.
        <div className="psearch-pop" onMouseDown={(e) => e.preventDefault()}>
          <ul className="psearch-list" role="listbox" id={listId} aria-label="Результаты поиска">
            {options.map((o, i) => (
              <li key={`${o.kind}-${o.key}`} role="presentation">
                {i === 0 && o.kind === 'saved' && <div className="psearch-group">Ваши места</div>}
                {i === firstNew && <div className="psearch-group">OpenStreetMap</div>}
                <div
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === current}
                  className={cx('psearch-opt', i === current && 'is-active')}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(o)}
                >
                  <Icon name={o.kind === 'saved' ? 'pin' : 'search'} size="sm" />
                  <div className="row-main">
                    <span className="psearch-name">
                      {o.kind === 'saved' ? o.item.place.name : o.candidate.name}
                    </span>
                    <span className="psearch-meta">
                      {o.kind === 'saved'
                        ? meta(
                            STATUS_LABEL[o.item.place.status],
                            o.item.place.address,
                            o.item.place.city,
                          )
                        : meta(
                            categoryLabel(o.candidate.category),
                            o.candidate.address,
                            o.candidate.city,
                          )}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {search.status === 'loading' && (
            <div className="psearch-state" role="status">
              <span className="spinner is-dark" aria-hidden="true" />
              Ищем…
            </div>
          )}
          {search.status === 'idle' && !options.length && (
            <div className="psearch-state">Введите хотя бы 3 буквы</div>
          )}
          {search.status === 'ready' && !options.length && (
            <div className="psearch-state">
              Ничего не нашлось. Попробуйте иначе или поставьте точку.
            </div>
          )}
          {search.status === 'error' && (
            <div className="psearch-state" role="alert">
              Поиск сейчас недоступен — можно поставить точку на карте вручную.
            </div>
          )}
          <div className="psearch-foot">
            <button
              type="button"
              className="textlink"
              onClick={() => {
                setOpen(false);
                onManual();
              }}
            >
              <Icon name="pin" />
              Поставить точку на карте
            </button>
            <span className="caption">Поиск: Photon · © OpenStreetMap</span>
          </div>
        </div>
      )}
    </div>
  );
}
