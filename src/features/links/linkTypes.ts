import type { IconName } from '@/components/ui/Icon';
import { joinLines } from '@/lib/clipboard';
import type { LinkItem, LinkType } from '@/types/models';

/** Типы ссылок: значения ТЗ (workspace/document/spreadsheet/other) + «Папка» из макета. */
export const LINK_TYPES: { value: LinkType; label: string; icon: IconName }[] = [
  { value: 'workspace', label: 'Notion', icon: 'notion' },
  { value: 'document', label: 'Документ', icon: 'doc' },
  { value: 'spreadsheet', label: 'Таблица', icon: 'sheet' },
  { value: 'folder', label: 'Папка', icon: 'folder' },
  { value: 'other', label: 'Другое', icon: 'globe' },
];

export function linkTypeMeta(type: LinkType) {
  return LINK_TYPES.find((t) => t.value === type) ?? LINK_TYPES[LINK_TYPES.length - 1]!;
}

export const linkDeleteCopy = {
  title: (l: LinkItem) => `Удалить ссылку «${l.title}»?`,
  text: () => 'Ссылка пропадёт из каталога. Сам документ останется на месте.',
};

/** Текст ссылки для буфера обмена: название, адрес, тип и описание (если есть). */
export function linkCopyText(l: Pick<LinkItem, 'title' | 'url' | 'type' | 'description'>): string {
  return joinLines([
    l.title.trim(),
    l.url,
    `Тип: ${linkTypeMeta(l.type).label}`,
    l.description && l.description.trim(),
  ]);
}
