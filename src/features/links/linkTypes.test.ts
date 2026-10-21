import { describe, expect, it } from 'vitest';
import { linkCopyText } from './linkTypes';

describe('linkCopyText', () => {
  it('без описания — без пустой строки', () => {
    expect(
      linkCopyText({
        title: 'Notion — планы',
        url: 'https://www.notion.so/',
        type: 'workspace',
        description: null,
      }),
    ).toBe('Notion — планы\nhttps://www.notion.so/\nТип: Notion');
    expect(
      linkCopyText({
        title: 'Таблица',
        url: 'https://docs.google.com/',
        type: 'spreadsheet',
        description: 'Бюджет на год',
      }),
    ).toBe('Таблица\nhttps://docs.google.com/\nТип: Таблица\nБюджет на год');
  });
});
