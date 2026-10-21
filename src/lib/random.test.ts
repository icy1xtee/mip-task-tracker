import { describe, expect, it } from 'vitest';
import { pickRandom, randomIndex } from './random';

describe('pickRandom', () => {
  it('возвращает null для пустого списка', () => {
    expect(pickRandom([])).toBeNull();
  });

  it('выбирает каждый элемент примерно поровну', () => {
    const counts = [0, 0, 0, 0, 0];
    const n = 50_000;
    for (let i = 0; i < n; i++) counts[randomIndex(5)]!++;
    for (const c of counts) expect(Math.abs(c / n - 0.2)).toBeLessThan(0.02);
  });

  it('отбрасывает значения из «хвоста», чтобы не смещать распределение', () => {
    const values = [0xffff_ffff, 7];
    const random = (buf: Uint32Array<ArrayBuffer>) => {
      buf[0] = values.shift() ?? 0;
      return buf;
    };
    // 0xffffffff >= limit для length 3 → отброшено, затем 7 % 3 = 1
    expect(randomIndex(3, random)).toBe(1);
  });
});
