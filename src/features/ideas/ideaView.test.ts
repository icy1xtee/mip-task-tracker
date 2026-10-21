import { describe, expect, it } from 'vitest';
import type { Activity } from '@/types/models';
import { applyBookingMode, bookingModeOf, randomPool } from './ideaView';

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
