import { useMemo, useState } from 'react';
import { usePageChrome } from '@/components/layout/chrome';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Choice';
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
import { sortByDue, taskDeleteCopy } from './taskView';
import { useTaskToggle } from './useTaskToggle';

type Filter = 'open' | 'done' | 'all';
type FormState = { task: Task | null } | null;

export function TasksPage() {
  const tasks = useTasks();
  const today = todayIsoDate();
  const [filter, setFilter] = useState<Filter>('open');
  const [form, setForm] = useState<FormState>(null);
  const toggle = useTaskToggle();
  const openNew = () => setForm({ task: null });

  usePageChrome({ title: 'Дела', sub: 'Общий список', addLabel: 'Новое дело' }, openNew);

  const del = useConfirmDelete<Task>({
    ...taskDeleteCopy,
    remove: (t) => deleteTask(t.id),
    doneMessage: 'Дело удалено',
  });

  const { open, done, sorted } = useMemo(() => {
    const sorted = sortByDue(tasks.data);
    return {
      sorted,
      open: sorted.filter((t) => !t.isCompleted),
      done: sorted.filter((t) => t.isCompleted),
    };
  }, [tasks.data]);

  const list = filter === 'open' ? open : filter === 'done' ? done : [...open, ...done];
  const openSum = open.reduce((s, t) => s + (t.estimatedCostMinor ?? 0), 0);
  const noTasks = tasks.data.length === 0;

  const lead =
    tasks.status !== 'ready'
      ? undefined
      : noTasks
        ? 'Список пуст'
        : `Осталось ${open.length} ${pl(open.length, 'дело', 'дела', 'дел')}${openSum ? ` на ${formatMoney(openSum)}` : ''} · выполнено ${done.length}`;

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
      {form && <TaskForm task={form.task} onClose={() => setForm(null)} />}
      {del.dialog}
    </div>
  );
}
