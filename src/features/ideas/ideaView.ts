import type { TagTone } from '@/components/ui/Tag';
import type { IconName } from '@/components/ui/Icon';
import type { MenuItem } from '@/components/ui/Menu';
import { formatDayMonthShort, type IsoDate } from '@/lib/format/dates';
import { formatMoney } from '@/lib/format/money';
import type { Activity, ActivityStatus } from '@/types/models';

/** Режим брони в форме (макет): нужна бронь / забронировано / бронь не нужна. */
export type BookingMode = 'needs' | 'booked' | 'none';

export function bookingModeOf(a: Pick<Activity, 'status' | 'needsBooking'>): BookingMode | null {
  if (a.status === 'booked') return 'booked';
  if (a.status === 'wishlist') return a.needsBooking ? 'needs' : 'none';
  return null;
}

export function applyBookingMode(mode: BookingMode): Pick<Activity, 'status' | 'needsBooking'> {
  if (mode === 'booked') return { status: 'booked', needsBooking: true };
  return { status: 'wishlist', needsBooking: mode === 'needs' };
}

export function statusTag(
  a: Activity,
  today: IsoDate,
): { label: string; tone: TagTone; icon?: IconName } {
  const when = a.plannedDate ? ` · ${formatDayMonthShort(a.plannedDate, today)}` : '';
  switch (a.status) {
    case 'booked':
      return { label: `Забронировано${when}`, tone: 'sage', icon: 'check' };
    case 'completed':
      return { label: `Сходили${when}`, tone: 'neutral', icon: 'check' };
    case 'archived':
      return { label: 'В архиве', tone: 'neutral', icon: 'archive' };
    default:
      return a.needsBooking
        ? { label: 'Не забронировано', tone: 'outline' }
        : { label: 'Бронь не нужна', tone: 'neutral' };
  }
}

export function costLabel(a: Pick<Activity, 'estimatedCostMinor'>): {
  label: string;
  perTwo: boolean;
} {
  if (a.estimatedCostMinor === null) return { label: 'Стоимость не указана', perTwo: false };
  if (a.estimatedCostMinor === 0) return { label: 'Бесплатно', perTwo: false };
  return { label: `≈ ${formatMoney(a.estimatedCostMinor)}`, perTwo: true };
}

/** Кандидаты для случайного выбора — только wishlist (не забронированные, не прошедшие, не архив). */
export function randomPool(activities: Activity[]): Activity[] {
  return activities.filter((a) => a.status === 'wishlist');
}

export const ideaDeleteCopy = {
  title: (i: Activity) => `Удалить идею «${i.title}»?`,
  text: () => 'Идея пропадёт из списка досуга и из случайного выбора.',
};

export type IdeaHandlers = {
  onEdit: (idea: Activity) => void;
  onStatus: (idea: Activity, status: ActivityStatus) => void;
  onDelete: (idea: Activity) => void;
};

export function ideaMenuItems(idea: Activity, h: IdeaHandlers): MenuItem[] {
  const items: MenuItem[] = [{ label: 'Изменить', icon: 'pencil', onSelect: () => h.onEdit(idea) }];
  if (idea.status === 'wishlist')
    items.push({
      label: 'Отметить бронь',
      icon: 'check',
      onSelect: () => h.onStatus(idea, 'booked'),
    });
  if (idea.status === 'booked')
    items.push({
      label: 'Снять бронь',
      icon: 'undo',
      onSelect: () => h.onStatus(idea, 'wishlist'),
    });
  if (idea.status === 'wishlist' || idea.status === 'booked') {
    items.push({ label: 'Сходили', icon: 'check', onSelect: () => h.onStatus(idea, 'completed') });
    items.push({ label: 'В архив', icon: 'archive', onSelect: () => h.onStatus(idea, 'archived') });
  } else {
    items.push({
      label: 'Вернуть в идеи',
      icon: 'undo',
      onSelect: () => h.onStatus(idea, 'wishlist'),
    });
  }
  items.push({ label: 'Удалить', icon: 'trash', danger: true, onSelect: () => h.onDelete(idea) });
  return items;
}
