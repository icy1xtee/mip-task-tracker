import { describe, expect, it } from 'vitest';
import {
  formatAmount,
  formatMoney,
  formatSignedMoney,
  formatThousands,
  minorToRublesInput,
  parseRublesToMinor,
} from './money';

describe('parseRublesToMinor', () => {
  it.each([
    ['7000', 700000],
    ['7 000', 700000],
    ['7\u00a0000,5', 700050],
    ['0,01', 1],
    ['12.34', 1234],
    ['-1500', -150000],
    ['−1500', -150000],
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
    [700000, '7 000'],
    [700050, '7 000,50'],
    [1, '0,01'],
    [150005, '1 500,05'],
  ])('%i → %s и обратно', (minor, expected) => {
    expect(minorToRublesInput(minor)).toBe(expected);
    expect(parseRublesToMinor(expected)).toBe(minor);
  });
});

describe('форматирование по дизайн-системе', () => {
  it('группирует разряды неразрывным пробелом', () => {
    expect(formatAmount(1234567800)).toBe('12\u00a0345\u00a0678');
    expect(formatMoney(700000)).toBe('7\u00a0000\u00a0₽');
  });

  it('использует знак минуса U+2212', () => {
    expect(formatMoney(-1845000)).toBe('−18\u00a0450\u00a0₽');
    expect(formatSignedMoney(-700000)).toBe('−7\u00a0000\u00a0₽');
    expect(formatSignedMoney(4500000)).toBe('+45\u00a0000\u00a0₽');
    expect(formatSignedMoney(0)).toBe('0\u00a0₽');
  });

  it('показывает копейки только если они есть', () => {
    expect(formatMoney(150050)).toBe('1\u00a0500,50\u00a0₽');
  });

  it('округляет до десятых тысячи для графика', () => {
    expect(formatThousands(4120000)).toBe('41,2');
    expect(formatThousands(3895000)).toBe('39,0');
  });
});
