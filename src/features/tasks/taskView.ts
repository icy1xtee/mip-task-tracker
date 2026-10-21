import { diffDays, formatDayMonthShort, type IsoDate } from '@/lib/format/dates';
import { pl } from '@/lib/format/plural';
import type { Task } from '@/types/models';

export type DueTone = 'overdue' | 'soon' | 'normal';

/** Подпись срока строки задачи, как в макете: «18 окт · просрочено на 2 дня», «Завтра, 21 окт». */
export function describeDue(
  task: Pick<Task, 'dueDate' | 'isCompleted'>,
  today: IsoDate,
): { text: string; tone: DueTone } {
  if (!task.dueDate) return { text: task.isCompleted ? 'Выполнено' : 'Без срока', tone: 'normal' };
  const short = formatDayMonthShort(task.dueDate, today);
  if (task.isCompleted) return { text: `Выполнено · срок ${short}`, tone: 'normal' };
  const days = diffDays(today, task.dueDate);
  if (days < 0)
    return {
      text: `${short} · просрочено на ${-days} ${pl(-days, 'день', 'дня', 'дней')}`,
      tone: 'overdue',
    };
  if (days === 0) return { text: 'Сегодня', tone: 'soon' };
  if (days === 1) return { text: `Завтра, ${short}`, tone: 'soon' };
  return { text: short, tone: 'normal' };
}

/** По сроку: сначала с датой (раньше — выше), задачи без срока — в конце. */
export function sortByDue(tasks: Task[]): Task[] {
  return tasks.slice().sort((a, b) => {
    if (a.dueDate === b.dueDate) return a.title.localeCompare(b.title, 'ru');
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate < b.dueDate ? -1 : 1;
  });
}

export function isOverdue(task: Task, today: IsoDate): boolean {
  return !task.isCompleted && task.dueDate !== null && task.dueDate < today;
}

export const taskDeleteCopy = {
  title: (t: Task) => `Удалить дело «${t.title}»?`,
  text: () => 'Дело исчезнет из списка у вас обоих.',
};
