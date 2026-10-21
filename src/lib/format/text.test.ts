import { describe, expect, it } from 'vitest';
import { pl } from './plural';
import { domainOf, isSafeUrl, normalizeUrl } from './url';

describe('pl', () => {
  it.each([
    [1, 'дело'],
    [2, 'дела'],
    [5, 'дел'],
    [11, 'дел'],
    [21, 'дело'],
    [22, 'дела'],
    [112, 'дел'],
    [0, 'дел'],
  ])('%i → %s', (n, expected) => {
    expect(pl(n, 'дело', 'дела', 'дел')).toBe(expected);
  });
});

describe('normalizeUrl', () => {
  it('добавляет https:// к адресу без схемы', () => {
    expect(normalizeUrl('notion.so/plans')).toBe('https://notion.so/plans');
  });

  it('оставляет http и https', () => {
    expect(normalizeUrl(' https://example.com/a?b=1 ')).toBe('https://example.com/a?b=1');
    expect(normalizeUrl('http://example.com')).toBe('http://example.com/');
  });

  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'data:text/html,<b>x</b>',
    'file:///etc/passwd',
    'ftp://example.com',
    'mailto:a@b.c',
    'просто текст',
    '',
  ])('отклоняет «%s»', (input) => {
    expect(normalizeUrl(input)).toBeNull();
  });

  it('isSafeUrl проверяет уже нормализованное значение', () => {
    expect(isSafeUrl('https://example.com/')).toBe(true);
    expect(isSafeUrl('javascript:alert(1)')).toBe(false);
  });

  it('domainOf убирает www', () => {
    expect(domainOf('https://www.notion.so/abc')).toBe('notion.so');
  });
});
