import { useMemo, useState } from 'react';
import { usePageChrome } from '@/components/layout/chrome';
import { Button } from '@/components/ui/Button';
import { Chips, type ChoiceOption } from '@/components/ui/Choice';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataView, EmptyState } from '@/components/ui/States';
import { useConfirmDelete } from '@/components/ui/useConfirmDelete';
import { todayIsoDate } from '@/lib/format/dates';
import { pl } from '@/lib/format/plural';
import { pickRandom } from '@/lib/random';
import type { Activity } from '@/types/models';
import { deleteActivity, useActivities } from './api';
import { IdeaCard } from './IdeaCard';
import { IdeaForm } from './IdeaForm';
import { ideaDeleteCopy, randomPool } from './ideaView';
import { NoPick, RandomPick } from './RandomPick';
import { useIdeaStatus } from './useIdeaStatus';

type Filter = 'all' | 'free' | 'booked' | 'completed' | 'archived';
type Pick = { id: string } | { none: true } | null;

export function IdeasPage() {
  const ideas = useActivities();
  const today = todayIsoDate();
  const [filter, setFilter] = useState<Filter>('all');
  const [pick, setPick] = useState<Pick>(null);
  const [form, setForm] = useState<{ idea: Activity | null } | null>(null);
  const setStatus = useIdeaStatus();
  const openNew = () => setForm({ idea: null });

  usePageChrome({ title: 'Идеи', sub: 'Досуг для двоих', addLabel: 'Новая идея' }, openNew);

  const del = useConfirmDelete<Activity>({
    ...ideaDeleteCopy,
    remove: (i) => deleteActivity(i.id),
    doneMessage: 'Идея удалена',
  });

  const groups = useMemo(() => {
    const sorted = ideas.data
      .slice()
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
    return {
      active: sorted.filter((i) => i.status !== 'archived'),
      free: sorted.filter((i) => i.status === 'wishlist'),
      booked: sorted.filter((i) => i.status === 'booked'),
      completed: sorted.filter((i) => i.status === 'completed'),
      archived: sorted.filter((i) => i.status === 'archived'),
    };
  }, [ideas.data]);

  const pool = randomPool(ideas.data);
  const pickedId = pick && 'id' in pick ? pick.id : null;
  const picked = pickedId ? ideas.data.find((i) => i.id === pickedId) : undefined;

  const randomize = () => {
    const candidates = pool.filter((i) => i.id !== pickedId);
    const next = pickRandom(candidates.length ? candidates : pool);
    setPick(next ? { id: next.id } : { none: true });
    if (next) setFilter('all');
  };

  const list = filter === 'all' ? groups.active : groups[filter];
  const chips: ChoiceOption<Filter>[] = [
    { value: 'all', label: 'Все', count: groups.active.length },
    { value: 'free', label: 'Не забронированы', count: groups.free.length },
    { value: 'booked', label: 'Забронированы', count: groups.booked.length },
  ];
  if (groups.completed.length || filter === 'completed')
    chips.push({ value: 'completed', label: 'Сходили', count: groups.completed.length });
  if (groups.archived.length || filter === 'archived')
    chips.push({ value: 'archived', label: 'Архив', count: groups.archived.length });

  const total = groups.active.length;
  const lead =
    ideas.status === 'ready'
      ? total
        ? `${total} ${pl(total, 'идея', 'идеи', 'идей')} · ${groups.free.length} ещё не ${pl(groups.free.length, 'забронирована', 'забронированы', 'забронированы')}`
        : 'Пока пусто'
      : undefined;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Для двоих"
        title="Идеи для досуга"
        lead={lead}
        actionsMobile
        actions={
          <>
            <Button
              variant="secondary"
              icon="shuffle"
              onClick={randomize}
              disabled={ideas.status !== 'ready'}
            >
              Выбрать случайно
            </Button>
            <Button icon="plus" className="hide-m" onClick={openNew}>
              Новая идея
            </Button>
          </>
        }
      />
      <DataView state={ideas}>
        {() => (
          <>
            {picked && (
              <RandomPick
                idea={picked}
                poolSize={pool.length}
                canPickOther={pool.some((i) => i.id !== picked.id)}
                onBook={() => setStatus(picked, 'booked')}
                onOther={randomize}
                onClose={() => setPick(null)}
              />
            )}
            {pick && 'none' in pick && (
              <NoPick
                hasIdeas={ideas.data.length > 0}
                onAdd={openNew}
                onClose={() => setPick(null)}
              />
            )}
            <Chips<Filter>
              ariaLabel="Фильтр идей"
              value={filter}
              onChange={setFilter}
              options={chips}
            />
            {list.length > 0 ? (
              <div className="cards">
                {list.map((i) => (
                  <IdeaCard
                    key={i.id}
                    idea={i}
                    today={today}
                    picked={i.id === pickedId}
                    onEdit={(idea) => setForm({ idea })}
                    onStatus={setStatus}
                    onDelete={del.ask}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon="idea"
                text={
                  ideas.data.length
                    ? 'В этом фильтре пока пусто. Добавьте идею, о которой давно говорили.'
                    : 'Здесь будут идеи для совместного досуга. Добавьте первую.'
                }
                action={
                  <Button icon="plus" onClick={openNew}>
                    Новая идея
                  </Button>
                }
              />
            )}
          </>
        )}
      </DataView>
      {form && <IdeaForm idea={form.idea} onClose={() => setForm(null)} />}
      {del.dialog}
    </div>
  );
}
