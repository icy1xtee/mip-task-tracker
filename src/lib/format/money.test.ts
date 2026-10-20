import { describe, expect, it } from 'vitest';
import { formatMoney, minorToRublesInput, parseRublesToMinor } from './money';

const normalizeSpaces = (s: string) => s.replace(/[\u00a0\u202f]/g, ' ');

describe('parseRublesToMinor', () => {
  it.each([
    ['7000', 700000],
    ['7 000', 700000],
    ['7\u00a0000,5', 700050],
    ['0,01', 1],
    ['12.34', 1234],
    ['-1500', -150000],
    ['1 500 ₽', 150000],
    ['0', 0],
    ['-0', 0],
  ])('%s → %i', (input, expected) => {
    expect(parseRublesToMinor(input)).toBe(expected);
  });

  it.each(['', 'abc', '1,234', '1.2.3', '--1', '1e5', ','])('отклоняет «%s»', (input) => {
    expect(parseRublesToMinor(input)).toBeNull();
  });

  it('не теряет копейки на значениях, неточных во float', () => {
    expect(parseRublesToMinor('0,29')).toBe(29);
    expect(parseRublesToMinor('1,15')).toBe(115);
  });
});

describe('minorToRublesInput', () => {
  it.each([
    [700000, '7000'],
    [700050, '7000,50'],
    [1, '0,01'],
    [-150005, '-1500,05'],
  ])('%i → %s', (minor, expected) => {
    expect(minorToRublesInput(minor)).toBe(expected);
    expect(parseRublesToMinor(expected)).toBe(minor);
  });
});

describe('formatMoney', () => {
  it('форматирует рубли в русской локали', () => {
    expect(normalizeSpaces(formatMoney(700000))).toBe('7 000 ₽');
    expect(normalizeSpaces(formatMoney(-150050))).toBe('-1 500,5 ₽');
  });
});
