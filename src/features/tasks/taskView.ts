import { joinLines } from '@/lib/clipboard';
import { diffDays, formatDayMonthShort, formatFullDate, type IsoDate } from '@/lib/format/dates';
import { formatMoney } from '@/lib/format/money';
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

export const MAX_TAGS_PER_TASK = 10;
export const MAX_TAG_LENGTH = 30;

/** «  медицина  » → «медицина»; пустое — null. Регистр сохраняется, сравнение — без регистра. */
export function normalizeTag(input: string): string | null {
  const tag = input.trim().replace(/\s+/g, ' ').slice(0, MAX_TAG_LENGTH).trim();
  return tag || null;
}

export function sameTag(a: string, b: string): boolean {
  return a.toLocaleLowerCase('ru') === b.toLocaleLowerCase('ru');
}

/** Все разделы из дел с количеством дел, по алфавиту. Разные регистры — один раздел. */
export function collectTags(tasks: Task[]): { tag: string; count: number }[] {
  const map = new Map<string, { tag: string; count: number }>();
  for (const t of tasks) {
    for (const tag of t.tags) {
      const key = tag.toLocaleLowerCase('ru');
      const entry = map.get(key) ?? { tag, count: 0 };
      entry.count += 1;
      map.set(key, entry);
    }
  }
  return [...map.values()].sort((a, b) => a.tag.localeCompare(b.tag, 'ru'));
}

export function hasTag(task: Task, tag: string): boolean {
  return task.tags.some((t) => sameTag(t, tag));
}

function fold(text: string): string {
  return text.toLocaleLowerCase('ru').replace(/ё/g, 'е');
}

/** Поиск по названию, заметке и разделам; «ё» = «е», без учёта регистра. */
export function matchesQuery(task: Task, query: string): boolean {
  const q = fold(query.trim());
  if (!q) return true;
  return fold([task.title, task.description ?? '', ...task.tags].join(' ')).includes(q);
}

/** Текст дела для буфера обмена: только заполненные поля. */
export function taskCopyText(
  t: Pick<
    Task,
    'title' | 'dueDate' | 'estimatedCostMinor' | 'tags' | 'description' | 'isCompleted'
  >,
): string {
  return joinLines([
    t.title.trim(),
    t.isCompleted && 'Статус: выполнено',
    t.dueDate && `Срок: ${formatFullDate(t.dueDate)}`,
    t.estimatedCostMinor ? `Стоимость: ${formatMoney(t.estimatedCostMinor)}` : null,
    t.tags.length > 0 && `Разделы: ${t.tags.join(', ')}`,
    t.description && `Заметка: ${t.description.trim()}`,
  ]);
}
