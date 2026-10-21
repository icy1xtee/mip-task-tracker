import { useMemo, useState } from 'react';
import { usePageChrome } from '@/components/layout/chrome';
import { Button, ExternalLink } from '@/components/ui/Button';
import { buttonClass } from '@/components/ui/buttonClass';
import { Chips, type ChoiceOption } from '@/components/ui/Choice';
import { SearchInput } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { RowMenu } from '@/components/ui/Menu';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataView, EmptyState } from '@/components/ui/States';
import { Tag } from '@/components/ui/Tag';
import { useConfirmDelete } from '@/components/ui/useConfirmDelete';
import { pl } from '@/lib/format/plural';
import { domainOf } from '@/lib/format/url';
import type { LinkItem, LinkType } from '@/types/models';
import { deleteLink, useLinks } from './api';
import { LinkForm } from './LinkForm';
import { LINK_TYPES, linkDeleteCopy, linkTypeMeta } from './linkTypes';

type Filter = 'all' | LinkType;

export function LinksPage() {
  const links = useLinks();
  const [q, setQ] = useState('');
  const [type, setType] = useState<Filter>('all');
  const [form, setForm] = useState<{ link: LinkItem | null } | null>(null);
  const openNew = () => setForm({ link: null });

  usePageChrome({ title: 'Ссылки', sub: 'Общие ресурсы', addLabel: 'Добавить ссылку' }, openNew);

  const del = useConfirmDelete<LinkItem>({
    ...linkDeleteCopy,
    remove: (l) => deleteLink(l.id),
    doneMessage: 'Ссылка удалена',
  });

  const sorted = useMemo(
    () => links.data.slice().sort((a, b) => a.title.localeCompare(b.title, 'ru')),
    [links.data],
  );
  const query = q.trim().toLowerCase();
  const filtered = sorted.filter(
    (l) =>
      (type === 'all' || l.type === type) &&
      (!query || `${l.title} ${l.description ?? ''}`.toLowerCase().includes(query)),
  );

  const chips: ChoiceOption<Filter>[] = [{ value: 'all', label: 'Все', count: links.data.length }];
  for (const t of LINK_TYPES) {
    const count = links.data.filter((l) => l.type === t.value).length;
    if (count || type === t.value) chips.push({ value: t.value, label: t.label, count });
  }

  const n = links.data.length;
  const lead =
    links.status === 'ready'
      ? n
        ? `${n} ${pl(n, 'общий ресурс', 'общих ресурса', 'общих ресурсов')}: пространства Notion, документы, таблицы и папки`
        : 'Пока пусто'
      : undefined;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Общие ресурсы"
        title="Ссылки"
        lead={lead}
        actions={
          <Button icon="plus" onClick={openNew}>
            Добавить ссылку
          </Button>
        }
      />
      <DataView state={links}>
        {() =>
          n === 0 ? (
            <EmptyState
              icon="link"
              text="Здесь будут общие документы и пространства. Добавьте первую ссылку."
              action={
                <Button icon="plus" onClick={openNew}>
                  Добавить ссылку
                </Button>
              }
            />
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <SearchInput
                  style={{ maxWidth: 420 }}
                  placeholder="Поиск по названию и описанию"
                  aria-label="Поиск ссылок"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <Chips<Filter>
                  ariaLabel="Тип ресурса"
                  value={type}
                  onChange={setType}
                  options={chips}
                />
              </div>
              {filtered.length > 0 ? (
                <div className="list">
                  {filtered.map((l) => {
                    const meta = linkTypeMeta(l.type);
                    return (
                      <div className="link-row" key={l.id}>
                        <span className="link-ic">
                          <Icon name={meta.icon} />
                        </span>
                        <div className="row-main">
                          <div className="op-title">{l.title}</div>
                          <div className="row-meta">
                            <span>{l.description ?? domainOf(l.url)}</span>
                          </div>
                        </div>
                        <span className="link-type">
                          <Tag>{meta.label}</Tag>
                        </span>
                        <span className="link-domain">{domainOf(l.url)}</span>
                        <ExternalLink
                          className={buttonClass('secondary', 'sm', 'link-open')}
                          href={l.url}
                          aria-label={`Открыть «${l.title}» в новой вкладке`}
                        >
                          <span className="link-open-label">Открыть</span>
                          <Icon name="ext" />
                        </ExternalLink>
                        <RowMenu
                          label={`Действия: ${l.title}`}
                          items={[
                            {
                              label: 'Изменить',
                              icon: 'pencil',
                              onSelect: () => setForm({ link: l }),
                            },
                            {
                              label: 'Удалить',
                              icon: 'trash',
                              danger: true,
                              onSelect: () => del.ask(l),
                            },
                          ]}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon="search"
                  text={`Ничего не нашлось${q ? ` по запросу «${q}»` : ''}. Попробуйте другое слово или другой тип.`}
                  action={
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setQ('');
                        setType('all');
                      }}
                    >
                      Сбросить поиск
                    </Button>
                  }
                />
              )}
            </>
          )
        }
      </DataView>
      {form && <LinkForm link={form.link} onClose={() => setForm(null)} />}
      {del.dialog}
    </div>
  );
}
