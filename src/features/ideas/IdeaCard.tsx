import { ExternalLink } from '@/components/ui/Button';
import { cx } from '@/components/ui/cx';
import { Icon } from '@/components/ui/Icon';
import { RowMenu } from '@/components/ui/Menu';
import { Tag } from '@/components/ui/Tag';
import type { IsoDate } from '@/lib/format/dates';
import { domainOf } from '@/lib/format/url';
import type { Activity } from '@/types/models';
import { costLabel, ideaMenuItems, statusTag, type IdeaHandlers } from './ideaView';

type IdeaCardProps = IdeaHandlers & { idea: Activity; today: IsoDate; picked: boolean };

export function IdeaCard({ idea, today, picked, ...handlers }: IdeaCardProps) {
  const cost = costLabel(idea);
  const tag = statusTag(idea, today);
  return (
    <article className={cx('card', picked && 'is-picked')}>
      <div className="card-top">
        <h3 className="card-title">{idea.title}</h3>
        <RowMenu label={`Действия: ${idea.title}`} items={ideaMenuItems(idea, handlers)} />
      </div>
      <p className="card-desc">{idea.description ?? ''}</p>
      <div className="card-foot">
        <span className="cost">
          <span className="money">{cost.label}</span>
          {cost.perTwo && <span className="small muted">на двоих</span>}
        </span>
        <Tag tone={tag.tone} icon={tag.icon}>
          {tag.label}
        </Tag>
      </div>
      <div className="card-link">
        {idea.url ? (
          <ExternalLink
            className="textlink"
            href={idea.url}
            aria-label={`Открыть сайт: ${idea.title} (в новой вкладке)`}
          >
            {domainOf(idea.url)}
            <Icon name="ext" />
          </ExternalLink>
        ) : (
          <span className="small muted">Без ссылки</span>
        )}
      </div>
    </article>
  );
}
