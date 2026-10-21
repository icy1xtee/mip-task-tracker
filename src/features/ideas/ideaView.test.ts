import { describe, expect, it } from 'vitest';
import type { Activity } from '@/types/models';
import { applyBookingMode, bookingModeOf, ideaCopyText, randomPool } from './ideaView';

const a = (id: string, status: Activity['status'], needsBooking = false): Activity => ({
  id,
  title: id,
  status,
  needsBooking,
  description: null,
  url: null,
  estimatedCostMinor: null,
  plannedDate: null,
  createdAt: null,
  updatedAt: null,
});

describe('ideas', () => {
  it('случайный выбор только из wishlist', () => {
    const pool = randomPool([
      a('w1', 'wishlist', true),
      a('w2', 'wishlist'),
      a('b', 'booked'),
      a('c', 'completed'),
      a('x', 'archived'),
    ]);
    expect(pool.map((i) => i.id)).toEqual(['w1', 'w2']);
  });

  it('режим брони ↔ статус', () => {
    expect(bookingModeOf(a('1', 'wishlist', true))).toBe('needs');
    expect(bookingModeOf(a('2', 'wishlist', false))).toBe('none');
    expect(bookingModeOf(a('3', 'booked'))).toBe('booked');
    expect(bookingModeOf(a('4', 'archived'))).toBeNull();
    expect(applyBookingMode('needs')).toEqual({ status: 'wishlist', needsBooking: true });
    expect(applyBookingMode('booked')).toEqual({ status: 'booked', needsBooking: true });
  });
});

describe('ideaCopyText', () => {
  it('всё заполнено', () => {
    expect(
      ideaCopyText({
        title: 'Ужин в грузинском ресторане',
        description: 'Хинкали и тихий зал',
        url: 'https://example.com/r',
        estimatedCostMinor: 400_000,
        status: 'booked',
        needsBooking: true,
        plannedDate: '2026-10-24',
      }),
    ).toBe(
      'Ужин в грузинском ресторане\nПримерно на двоих: 4\u00a0000\u00a0₽\nДата: 24 октября 2026\nБронирование: забронировано\nСсылка: https://example.com/r\nХинкали и тихий зал',
    );
  });

  it('пустые поля не попадают, бесплатно — попадает', () => {
    expect(
      ideaCopyText({
        title: 'Настолки',
        description: null,
        url: null,
        estimatedCostMinor: 0,
        status: 'wishlist',
        needsBooking: false,
        plannedDate: null,
      }),
    ).toBe('Настолки\nСтоимость: бесплатно\nБронирование: не нужна');
    expect(
      ideaCopyText({
        title: 'Каток',
        description: null,
        url: null,
        estimatedCostMinor: null,
        status: 'archived',
        needsBooking: true,
        plannedDate: null,
      }),
    ).toBe('Каток\nСтатус: в архиве');
  });
});
