import { describe, expect, it } from 'vitest';
import type { Task } from '@/types/models';
import { describeDue, sortByDue } from './taskView';

const TODAY = '2026-10-20';
const task = (id: string, dueDate: string | null, isCompleted = false): Task => ({
  id,
  title: id,
  dueDate,
  isCompleted,
  description: null,
  estimatedCostMinor: null,
  assignee: null,
  createdAt: null,
  updatedAt: null,
});

describe('describeDue', () => {
  it.each([
    ['2026-10-18', '18 окт · просрочено на 2 дня', 'overdue'],
    ['2026-10-19', '19 окт · просрочено на 1 день', 'overdue'],
    ['2026-10-20', 'Сегодня', 'soon'],
    ['2026-10-21', 'Завтра, 21 окт', 'soon'],
    ['2026-10-25', '25 окт', 'normal'],
  ])('%s → %s', (due, text, tone) => {
    expect(describeDue(task('t', due), TODAY)).toEqual({ text, tone });
  });

  it('выполненные и без срока', () => {
    expect(describeDue(task('t', '2026-10-15', true), TODAY)).toEqual({
      text: 'Выполнено · срок 15 окт',
      tone: 'normal',
    });
    expect(describeDue(task('t', null), TODAY).text).toBe('Без срока');
  });
});

describe('sortByDue', () => {
  it('сортирует по сроку, без срока — в конце', () => {
    const sorted = sortByDue([task('c', null), task('b', '2026-10-25'), task('a', '2026-10-18')]);
    expect(sorted.map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });
});
