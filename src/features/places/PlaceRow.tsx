import { cx } from '@/components/ui/cx';
import { Icon } from '@/components/ui/Icon';
import type { IsoDate } from '@/lib/format/dates';
import { formatScore, markerKind, placeSubtitle, type PlaceItem } from './placesView';

export function PlaceScores({ item }: { item: PlaceItem }) {
  const { rating, returnScore } = item.stats;
  if (rating === null && returnScore === null) return null;
  return (
    <span className="pscores-inline">
      {rating !== null && (
        <span title="Впечатление">
          <Icon name="star" size="sm" />
          {formatScore(rating)}
        </span>
      )}
      {returnScore !== null && (
        <span title="Хочется вернуться" className="muted">
          <Icon name="repeat" size="sm" />
          {formatScore(returnScore)}
        </span>
      )}
    </span>
  );
}

export function PlaceMarkerDot({ item }: { item: PlaceItem }) {
  return <span className={cx('pdot', `pdot-${markerKind(item)}`)} aria-hidden="true" />;
}

type PlaceRowProps = { item: PlaceItem; today: IsoDate; selected: boolean; onOpen: () => void };

export function PlaceRow({ item, today, selected, onOpen }: PlaceRowProps) {
  return (
    <button type="button" className={cx('prow', selected && 'is-sel')} onClick={onOpen}>
      <PlaceMarkerDot item={item} />
      <span className="row-main">
        <span className="prow-name">{item.place.name}</span>
        <span className="row-meta">
          <span>{placeSubtitle(item, today)}</span>
        </span>
      </span>
      <PlaceScores item={item} />
    </button>
  );
}
