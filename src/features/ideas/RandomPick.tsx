import { Button, ExternalLink, IconButton } from '@/components/ui/Button';
import { buttonClass } from '@/components/ui/buttonClass';
import { Icon } from '@/components/ui/Icon';
import { Tag } from '@/components/ui/Tag';
import { pl } from '@/lib/format/plural';
import type { Activity } from '@/types/models';
import { costLabel } from './ideaView';

type RandomPickProps = {
  idea: Activity;
  poolSize: number;
  canPickOther: boolean;
  onBook: () => void;
  onOther: () => void;
  onClose: () => void;
};

/** Результат «Выбрать случайно» (макет «Идеи · после «Выбрать случайно»»). */
export function RandomPick({
  idea,
  poolSize,
  canPickOther,
  onBook,
  onOther,
  onClose,
}: RandomPickProps) {
  const cost = costLabel(idea);
  return (
    <section className="pick" aria-live="polite">
      <div className="pick-main">
        <div className="pick-label">
          <Icon name="shuffle" />
          Случайный выбор из {poolSize}{' '}
          {pl(poolSize, 'свободной идеи', 'свободных идей', 'свободных идей')}
        </div>
        <div className="pick-title">{idea.title}</div>
        <div className="pick-meta">
          <span className="money" style={{ color: 'var(--ink)' }}>
            {cost.label}
          </span>
          {cost.perTwo && ' на двоих'}
          {idea.description && ` · ${idea.description}`}
        </div>
      </div>
      <div className="pick-actions">
        {idea.url && (
          <ExternalLink className={buttonClass('primary', 'sm')} href={idea.url}>
            Открыть сайт
            <Icon name="ext" />
          </ExternalLink>
        )}
        {idea.status === 'wishlist' && idea.needsBooking && (
          <Button variant="secondary" size="sm" icon="check" onClick={onBook}>
            Забронировали
          </Button>
        )}
        {idea.status === 'booked' && (
          <Tag tone="positive" icon="check">
            Забронировано
          </Tag>
        )}
        <Button variant="ghost" size="sm" onClick={onOther} disabled={!canPickOther}>
          Другой вариант
        </Button>
        <IconButton icon="x" label="Скрыть результат" onClick={onClose} />
      </div>
    </section>
  );
}

/** Объяснение, когда выбирать не из чего (ТЗ: объяснить и предложить добавить идею). */
export function NoPick({
  hasIdeas,
  onAdd,
  onClose,
}: {
  hasIdeas: boolean;
  onAdd: () => void;
  onClose: () => void;
}) {
  return (
    <section className="pick" aria-live="polite">
      <div className="pick-main">
        <div className="pick-label">
          <Icon name="shuffle" />
          Выбирать не из чего
        </div>
        <div className="pick-meta">
          {hasIdeas
            ? 'Все идеи уже забронированы, прошли или в архиве. Добавьте новую — и случайный выбор снова заработает.'
            : 'Пока нет ни одной идеи. Добавьте первую — и можно будет выбирать случайно.'}
        </div>
      </div>
      <div className="pick-actions">
        <Button size="sm" icon="plus" onClick={onAdd}>
          Новая идея
        </Button>
        <IconButton icon="x" label="Скрыть" onClick={onClose} />
      </div>
    </section>
  );
}
