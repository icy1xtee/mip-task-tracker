import { Button, IconButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { formatAgo, type IsoDate } from '@/lib/format/dates';
import { categoryLabel } from './placeMeta';
import {
  formatScore,
  recommendationScore,
  type PlaceItem,
  type Recommendation,
} from './placesView';
import { PlaceMarkerDot } from './PlaceRow';

/** Краткая карточка поверх карты по клику на точку. */
export function PlacePeek({
  item,
  today,
  onOpen,
  onClose,
}: {
  item: PlaceItem;
  today: IsoDate;
  onOpen: () => void;
  onClose: () => void;
}) {
  const { place, stats } = item;
  return (
    <section className="ppeek" aria-label={`Место: ${place.name}`} aria-live="polite">
      <div className="ppeek-top">
        <PlaceMarkerDot item={item} />
        <div className="row-main">
          <h2 className="ppeek-name">{place.name}</h2>
          <span className="row-meta">
            <span>{[categoryLabel(place.category), place.city].filter(Boolean).join(' · ')}</span>
          </span>
        </div>
        <IconButton icon="x" label="Скрыть карточку" onClick={onClose} />
      </div>
      <div className="ppeek-facts">
        {stats.visits.length ? (
          <>
            <span title="Впечатление">
              <Icon name="star" size="sm" />
              {stats.rating !== null ? formatScore(stats.rating) : '—'}
            </span>
            <span title="Хочется вернуться">
              <Icon name="repeat" size="sm" />
              {stats.returnScore !== null ? formatScore(stats.returnScore) : '—'}
            </span>
            {stats.lastVisit && (
              <span className="muted">были {formatAgo(stats.lastVisit, today)}</span>
            )}
          </>
        ) : (
          <span className="muted">Хотим посетить</span>
        )}
      </div>
      <Button size="sm" onClick={onOpen}>
        Открыть карточку
      </Button>
    </section>
  );
}

/** «Вам стоит сходить сюда снова» — главная рекомендация раздела. */
export function ReturnRecommendations({
  recs,
  today,
  onOpen,
}: {
  recs: Recommendation[];
  today: IsoDate;
  onOpen: (placeId: string) => void;
}) {
  return (
    <section className="precs" aria-labelledby="precs-title">
      <h3 className="h3" id="precs-title">
        <Icon name="repeat" />
        Вам стоит сходить сюда снова
      </h3>
      <div className="precs-row">
        {recs.map(({ item, reason }) => (
          <button
            type="button"
            key={item.place.id}
            className="prec"
            onClick={() => onOpen(item.place.id)}
            title={`Оценка рекомендации: ${formatScore(recommendationScore(item.stats) ?? 0)}`}
          >
            <span className="prec-name">{item.place.name}</span>
            <span className="ppeek-facts">
              {item.stats.rating !== null && (
                <span>
                  <Icon name="star" size="sm" />
                  {formatScore(item.stats.rating)}
                </span>
              )}
              {item.stats.returnScore !== null && (
                <span>
                  <Icon name="repeat" size="sm" />
                  {formatScore(item.stats.returnScore)}
                </span>
              )}
              {item.stats.lastVisit && (
                <span className="muted">были {formatAgo(item.stats.lastVisit, today)}</span>
              )}
            </span>
            <span className="prec-why">{reason}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
