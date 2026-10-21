import { useMemo, useState } from 'react';
import { usePageChrome } from '@/components/layout/chrome';
import { Button } from '@/components/ui/Button';
import { Chips, Segmented, type ChoiceOption } from '@/components/ui/Choice';
import { SearchInput } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataView, EmptyState } from '@/components/ui/States';
import { useConfirmDelete } from '@/components/ui/useConfirmDelete';
import { todayIsoDate } from '@/lib/format/dates';
import { formatMoney } from '@/lib/format/money';
import { pl } from '@/lib/format/plural';
import type { Task } from '@/types/models';
import { deleteTask, useTasks } from './api';
import { TaskForm } from './TaskForm';
import { TaskRow } from './TaskRow';
import { collectTags, hasTag, matchesQuery, sortByDue, taskDeleteCopy } from './taskView';
import { useTaskToggle } from './useTaskToggle';

type Filter = 'open' | 'done' | 'all';
/** '' — все разделы. */
type TagFilter = string;
type FormState = { task: Task | null } | null;

export function TasksPage() {
  const tasks = useTasks();
  const today = todayIsoDate();
  const [filter, setFilter] = useState<Filter>('open');
  const [form, setForm] = useState<FormState>(null);
  const [q, setQ] = useState('');
  const [tag, setTag] = useState<TagFilter>('');
  const toggle = useTaskToggle();
  const openNew = () => setForm({ task: null });

  usePageChrome({ title: 'Дела', sub: 'Общий список', addLabel: 'Новое дело' }, openNew);

  const del = useConfirmDelete<Task>({
    ...taskDeleteCopy,
    remove: (t) => deleteTask(t.id),
    doneMessage: 'Дело удалено',
  });

  const tags = useMemo(() => collectTags(tasks.data), [tasks.data]);
  const activeTag = tags.find((t) => t.tag === tag)?.tag ?? '';

  const { allOpen, allDone, open, done, sorted } = useMemo(() => {
    const all = sortByDue(tasks.data);
    // Поиск и раздел сужают список; переключатель «Осталось / Выполнено» работает поверх них.
    const sorted = all.filter((t) => (!activeTag || hasTag(t, activeTag)) && matchesQuery(t, q));
    return {
      allOpen: all.filter((t) => !t.isCompleted),
      allDone: all.filter((t) => t.isCompleted),
      sorted,
      open: sorted.filter((t) => !t.isCompleted),
      done: sorted.filter((t) => t.isCompleted),
    };
  }, [tasks.data, activeTag, q]);

  const list = filter === 'open' ? open : filter === 'done' ? done : [...open, ...done];
  const openSum = allOpen.reduce((s, t) => s + (t.estimatedCostMinor ?? 0), 0);
  const noTasks = tasks.data.length === 0;
  const narrowed = Boolean(activeTag || q.trim());
  const resetFilters = () => {
    setQ('');
    setTag('');
  };
  const tagChips: ChoiceOption<TagFilter>[] = [
    { value: '', label: 'Все разделы', count: tasks.data.length },
    ...tags.map((t) => ({ value: t.tag, label: t.tag, count: t.count })),
  ];

  const lead =
    tasks.status !== 'ready'
      ? undefined
      : noTasks
        ? 'Список пуст'
        : `Осталось ${allOpen.length} ${pl(allOpen.length, 'дело', 'дела', 'дел')}${openSum ? ` на ${formatMoney(openSum)}` : ''} · выполнено ${allDone.length}`;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Общие дела"
        title="Дела"
        lead={lead}
        actions={
          <Button icon="plus" onClick={openNew}>
            Новое дело
          </Button>
        }
      />
      <DataView state={tasks}>
        {() => (
          <>
            {!noTasks && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <SearchInput
                  style={{ maxWidth: 420 }}
                  placeholder="Поиск по делам"
                  aria-label="Поиск по делам"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                {tags.length > 0 && (
                  <Chips<TagFilter>
                    ariaLabel="Раздел"
                    value={activeTag}
                    onChange={setTag}
                    options={tagChips}
                  />
                )}
              </div>
            )}
            <div className="toolbar">
              <Segmented<Filter>
                ariaLabel="Фильтр дел"
                value={filter}
                onChange={setFilter}
                options={[
                  { value: 'open', label: 'Осталось', count: open.length },
                  { value: 'done', label: 'Выполнено', count: done.length },
                  { value: 'all', label: 'Все', count: sorted.length },
                ]}
              />
              <span className="small muted hide-m">Сортировка по сроку</span>
            </div>
            {list.length > 0 ? (
              <div className="list">
                {list.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    today={today}
                    onToggle={toggle}
                    onEdit={(task) => setForm({ task })}
                    onDelete={del.ask}
                  />
                ))}
              </div>
            ) : narrowed ? (
              <EmptyState
                icon="search"
                text={`Ничего не нашлось${q.trim() ? ` по запросу «${q.trim()}»` : ''}${activeTag ? ` в разделе «${activeTag}»` : ''}${
                  filter === 'open'
                    ? ' среди оставшихся дел'
                    : filter === 'done'
                      ? ' среди выполненных'
                      : ''
                }.`}
                action={
                  <Button variant="secondary" onClick={resetFilters}>
                    Сбросить поиск
                  </Button>
                }
              />
            ) : filter === 'done' && !noTasks ? (
              <EmptyState
                icon="tasks"
                text="Выполненных дел пока нет — отмечайте их галочкой в списке."
                action={<Button onClick={() => setFilter('open')}>К оставшимся делам</Button>}
              />
            ) : (
              <EmptyState
                icon="tasks"
                text={
                  noTasks
                    ? 'Пока нет дел. Добавьте первое — например, оплату счёта или покупку билетов.'
                    : 'Все дела сделаны. Добавьте новое, когда появится.'
                }
                action={
                  <Button icon="plus" onClick={openNew}>
                    Новое дело
                  </Button>
                }
              />
            )}
          </>
        )}
      </DataView>
      {form && (
        <TaskForm
          task={form.task}
          knownTags={tags.map((t) => t.tag)}
          onClose={() => setForm(null)}
        />
      )}
      {del.dialog}
    </div>
  );
}
