import { describe, expect, it } from 'vitest';
import { DOG_SKIN } from './dogSkin';
import { fearAt, pick } from './petEngine';

describe('DOG_SKIN', () => {
  const { frames, palette, size } = DOG_SKIN;
  const all = [...frames.idle, ...frames.walk, frames.held, frames.happy];

  it('все кадры ровно size.w × size.h', () => {
    for (const frame of all) {
      expect(frame).toHaveLength(size.h);
      for (const row of frame) expect(row).toHaveLength(size.w);
    }
  });

  it('в кадрах только символы палитры', () => {
    for (const frame of all)
      for (const row of frame) for (const ch of row) expect(palette).toHaveProperty(ch);
  });

  it('есть реплики на нажатие и радость', () => {
    expect(DOG_SKIN.messages.tap.length).toBeGreaterThan(0);
    expect(DOG_SKIN.messages.cheer.length).toBeGreaterThan(0);
  });
});

describe('fearAt', () => {
  it('0 на полу и ниже, 1 под потолком', () => {
    expect(fearAt(500, 500)).toBe(0);
    expect(fearAt(600, 500)).toBe(0);
    expect(fearAt(0, 500)).toBe(1);
    expect(fearAt(250, 500)).toBe(0.5);
  });
});

describe('pick', () => {
  it('не выходит за массив даже при rnd() = 1', () => {
    expect(pick(['a', 'b'], () => 0)).toBe('a');
    expect(pick(['a', 'b'], () => 0.99)).toBe('b');
    expect(pick(['a', 'b'], () => 1)).toBe('a');
  });
});
