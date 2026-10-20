import { CalendarCheck, House, Link2, Sparkles, Wallet, type LucideIcon } from 'lucide-react';

export type NavItem = { to: string; label: string; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Обзор', icon: House },
  { to: '/tasks', label: 'Дела', icon: CalendarCheck },
  { to: '/ideas', label: 'Идеи', icon: Sparkles },
  { to: '/budget', label: 'Бюджет', icon: Wallet },
  { to: '/links', label: 'Ссылки', icon: Link2 },
];
