import { describe, expect, it } from 'vitest';
import type { Task } from '@/types/models';
import {
  taskCopyText,
  collectTags,
  describeDue,
  hasTag,
  matchesQuery,
  normalizeTag,
  sortByDue,
} from './taskView';

const TODAY = '2026-10-20';
const task = (id: string, dueDate: string | null, isCompleted = false): Task => ({
  id,
  title: id,
  dueDate,
  isCompleted,
  description: null,
  estimatedCostMinor: null,
  assignee: null,
  tags: [],
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

describe('разделы и поиск', () => {
  const eyes = { ...task('Сходить к врачу по поводу зрения', null), tags: ['Медицина'] };
  const teeth = {
    ...task('Полечить зубы', null),
    tags: ['медицина', 'Деньги'],
    description: 'Клиника на Тверской',
  };
  const other = task('Купить ёлку', null);

  it('нормализует название раздела', () => {
    expect(normalizeTag('  Медицина   и   здоровье ')).toBe('Медицина и здоровье');
    expect(normalizeTag('   ')).toBeNull();
    expect(normalizeTag('x'.repeat(50))).toHaveLength(30);
  });

  it('собирает разделы без учёта регистра и считает дела', () => {
    expect(collectTags([eyes, teeth, other])).toEqual([
      { tag: 'Деньги', count: 1 },
      { tag: 'Медицина', count: 2 },
    ]);
    expect(hasTag(teeth, 'МЕДИЦИНА')).toBe(true);
  });

  it('ищет по названию, заметке и разделам; ё = е', () => {
    expect(matchesQuery(eyes, 'зрени')).toBe(true);
    expect(matchesQuery(teeth, 'тверск')).toBe(true);
    expect(matchesQuery(teeth, 'деньги')).toBe(true);
    expect(matchesQuery(other, 'елку')).toBe(true);
    expect(matchesQuery(other, 'зубы')).toBe(false);
    expect(matchesQuery(other, '  ')).toBe(true);
  });
});

describe('taskCopyText', () => {
  it('копирует только заполненные поля', () => {
    expect(
      taskCopyText({
        title: 'Полечить зубы',
        dueDate: '2026-11-03',
        estimatedCostMinor: 1_500_000,
        tags: ['Медицина', 'Деньги'],
        description: 'Клиника на Тверской',
        isCompleted: false,
      }),
    ).toBe(
      'Полечить зубы\nСрок: 3 ноября 2026\nСтоимость: 15\u00a0000\u00a0₽\nРазделы: Медицина, Деньги\nЗаметка: Клиника на Тверской',
    );
  });

  it('без даты, стоимости, разделов и заметки — только название', () => {
    expect(
      taskCopyText({
        title: ' Забрать посылку ',
        dueDate: null,
        estimatedCostMinor: null,
        tags: [],
        description: null,
        isCompleted: false,
      }),
    ).toBe('Забрать посылку');
    expect(
      taskCopyText({
        title: 'Оплатить',
        dueDate: null,
        estimatedCostMinor: 0,
        tags: [],
        description: null,
        isCompleted: true,
      }),
    ).toBe('Оплатить\nСтатус: выполнено');
  });
});
