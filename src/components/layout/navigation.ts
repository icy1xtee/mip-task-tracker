import type { IconName } from '@/components/ui/Icon';

export type NavItem = { to: string; label: string; icon: IconName; end?: boolean };

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Обзор', icon: 'home', end: true },
  { to: '/tasks', label: 'Дела', icon: 'tasks' },
  { to: '/ideas', label: 'Идеи', icon: 'idea' },
  { to: '/budget', label: 'Бюджет', icon: 'wallet' },
  { to: '/links', label: 'Ссылки', icon: 'link' },
];
