import { Button, ExternalLink } from '@/components/ui/Button';
import { buttonClass } from '@/components/ui/buttonClass';
import { Icon } from '@/components/ui/Icon';
import { RowMenu } from '@/components/ui/Menu';
import { ViewPanel } from '@/components/ui/Panel';
import { Tag } from '@/components/ui/Tag';
import { formatAgo, formatDayMonth, type IsoDate } from '@/lib/format/dates';
import { formatMoney } from '@/lib/format/money';
import { pl } from '@/lib/format/plural';
import type { PlaceVisit } from '@/types/models';
import { categoryLabel, PARTNERS, SCORE_MAX, STATUS_LABEL } from './placeMeta';
import {
  formatScore,
  formatScoreShort,
  isFavorite,
  osmUrl,
  recommendable,
  recommendationReason,
  routeUrl,
  type PlaceItem,
} from './placesView';
import { useOsmDetails } from './useOsmDetails';

type PlaceSheetProps = {
  item: PlaceItem;
  today: IsoDate;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddVisit: () => void;
  onEditVisit: (visit: PlaceVisit) => void;
  onDeleteVisit: (visit: PlaceVisit) => void;
};

function ScoreOf({ value }: { value: number | null }) {
  if (value === null) return <span className="muted">—</span>;
  return (
    <span className="num">
      {formatScoreShort(value)}
      <span className="muted">/{SCORE_MAX}</span>
    </span>
  );
}

/** Полная карточка места: средние оценки, оценки каждого, история посещений, маршрут и сайт. */
export function PlaceSheet({
  item,
  today,
  open,
  onClose,
  onEdit,
  onDelete,
  onAddVisit,
  onEditVisit,
  onDeleteVisit,
}: PlaceSheetProps) {
  const { place, stats } = item;
  const details = useOsmDetails(place.providerPlaceId);
  const osm = place.providerPlaceId ? osmUrl(place.providerPlaceId) : null;
  const visited = place.status === 'visited';
  const where = [place.address, place.city].filter(Boolean).join(', ');

  return (
    <ViewPanel
      open={open}
      onClose={onClose}
      title={place.name}
      headerActions={
        <RowMenu
          label={`Действия: ${place.name}`}
          items={[
            { label: 'Изменить', icon: 'pencil', onSelect: onEdit },
            { label: 'Удалить', icon: 'trash', danger: true, onSelect: onDelete },
          ]}
        />
      }
      footer={
        <>
          <ExternalLink className={buttonClass('secondary')} href={routeUrl(place)}>
            <Icon name="route" />
            Маршрут
          </ExternalLink>
          {details?.website && (
            <ExternalLink className={buttonClass('secondary')} href={details.website}>
              <Icon name="ext" />
              Сайт
            </ExternalLink>
          )}
          <div className="spacer" />
          <Button icon="plus" onClick={onAddVisit}>
            {visited ? 'Добавить визит' : 'Мы здесь были'}
          </Button>
        </>
      }
    >
      <div className="psheet-head">
        {where && <p className="sub">{where}</p>}
        <div className="psheet-tags">
          <Tag>{categoryLabel(place.category)}</Tag>
          <Tag tone={visited ? 'positive' : 'outline'} icon={visited ? 'check' : undefined}>
            {STATUS_LABEL[place.status]}
          </Tag>
          {isFavorite(stats) && (
            <Tag tone="accent" icon="heart">
              Любимое
            </Tag>
          )}
        </div>
      </div>

      {stats.visits.length > 0 && (
        <>
          <div className="pscores">
            <div className="pscore">
              <span className="pscore-val">
                <Icon name="star" />
                {stats.rating !== null ? formatScore(stats.rating) : '—'}
              </span>
              <span className="caption">Впечатление</span>
            </div>
            <div className="pscore">
              <span className="pscore-val">
                <Icon name="repeat" />
                {stats.returnScore !== null ? formatScore(stats.returnScore) : '—'}
              </span>
              <span className="caption">Хочется вернуться</span>
            </div>
          </div>

          <div className="ppartners" role="table" aria-label="Оценки каждого">
            <div className="ppartners-row ppartners-head" role="row">
              <span role="columnheader" />
              <span role="columnheader">Впечатление</span>
              <span role="columnheader">Вернуться</span>
            </div>
            {PARTNERS.map((p) => (
              <div className="ppartners-row" role="row" key={p.key}>
                <span role="rowheader" className="ppartners-name">
                  {p.name}
                </span>
                <span role="cell">
                  <ScoreOf value={stats.partners[p.key].rating} />
                </span>
                <span role="cell">
                  <ScoreOf value={stats.partners[p.key].returnScore} />
                </span>
              </div>
            ))}
          </div>

          {recommendable(stats) && (
            <p className="notice notice-accent">
              <Icon name="repeat" />
              {recommendationReason(stats)}
            </p>
          )}

          <div className="psheet-facts">
            <div className="kv">
              <span className="kv-name">Последний визит</span>
              <span>
                {stats.lastVisit && formatDayMonth(stats.lastVisit, today)}
                {stats.lastVisit && (
                  <span className="muted"> · {formatAgo(stats.lastVisit, today)}</span>
                )}
              </span>
            </div>
            <div className="kv">
              <span className="kv-name">Посещений</span>
              <span className="num">{stats.visits.length}</span>
            </div>
            {stats.spentKnown && (
              <div className="kv">
                <span className="kv-name">Потрачено за всё время</span>
                <span className="money">{formatMoney(stats.spentMinor)}</span>
              </div>
            )}
          </div>
        </>
      )}

      {!visited && stats.visits.length === 0 && (
        <p className="sub small">
          Ещё не были. Когда сходите — нажмите «Мы здесь были» и поставьте оценки.
        </p>
      )}

      {place.note && <p className="psheet-note">{place.note}</p>}

      {details?.openingHours && (
        <div className="kv">
          <span className="kv-name">Часы работы</span>
          <span className="small">{details.openingHours}</span>
        </div>
      )}
      {osm && (
        <ExternalLink className="textlink small" href={osm}>
          Объект в OpenStreetMap
          <Icon name="ext" />
        </ExternalLink>
      )}

      {stats.visits.length > 0 && (
        <section className="stack" aria-label="История посещений">
          <h3 className="h3">
            История · {stats.visits.length}{' '}
            {pl(stats.visits.length, 'посещение', 'посещения', 'посещений')}
          </h3>
          <div className="list">
            {stats.visits.map((v) => (
              <div className="pvisit" key={v.id}>
                <div className="row-main">
                  <span className="pvisit-date">{formatDayMonth(v.date, today)}</span>
                  <span className="pvisit-scores">
                    {PARTNERS.map((p) => (
                      <span key={p.key}>
                        {p.name}
                        <Icon name="star" size="sm" />
                        {v[p.rating] ?? '—'}
                        <Icon name="repeat" size="sm" />
                        {v[p.returnScore] ?? '—'}
                      </span>
                    ))}
                  </span>
                  {v.note && <span className="pvisit-note">«{v.note}»</span>}
                </div>
                {v.spentMinor !== null && (
                  <span className="money">{formatMoney(v.spentMinor)}</span>
                )}
                <RowMenu
                  label={`Посещение ${formatDayMonth(v.date, today)}`}
                  items={[
                    { label: 'Изменить', icon: 'pencil', onSelect: () => onEditVisit(v) },
                    {
                      label: 'Удалить',
                      icon: 'trash',
                      danger: true,
                      onSelect: () => onDeleteVisit(v),
                    },
                  ]}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </ViewPanel>
  );
}
