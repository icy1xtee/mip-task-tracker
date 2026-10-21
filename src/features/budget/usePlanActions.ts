import type { MenuItem } from '@/components/ui/Menu';
import { useToast } from '@/components/ui/useToast';
import { getErrorMessage } from '@/lib/firebase/errors';
import type { PlanItem } from '@/lib/finance/plan';
import { formatDayMonth, type IsoDate } from '@/lib/format/dates';
import { completePlanItem, reopenPlanItem, skipPlanItem } from './api';

type Handlers = { onEdit: (item: PlanItem) => void; onDelete: (item: PlanItem) => void };

/** Действия над элементом плана: оплачено / пропустить / вернуть, изменить, удалить. */
export function usePlanActions(today: IsoDate, { onEdit, onDelete }: Handlers) {
  const toast = useToast();

  const run = async (
    op: () => Promise<unknown>,
    message: string,
    undo?: () => Promise<unknown>,
  ) => {
    try {
      await op();
      toast(
        message,
        undo
          ? {
              action: {
                label: 'Отменить',
                onClick: () => undo().catch((e) => toast(getErrorMessage(e), { error: true })),
              },
            }
          : undefined,
      );
    } catch (e) {
      toast(getErrorMessage(e), { error: true });
    }
  };

  return (item: PlanItem): MenuItem[] => {
    const income = item.type === 'income';
    const recurring = item.source === 'recurring';
    const items: MenuItem[] = [];
    if (item.status === 'planned') {
      items.push({
        label: income ? 'Получено' : 'Оплачено',
        icon: 'check',
        onSelect: () =>
          run(
            () => completePlanItem(item, today),
            `${income ? 'Поступление отмечено' : 'Оплата отмечена'} и добавлена в фактические операции`,
          ),
      });
      items.push({
        label: recurring ? 'Пропустить в этот раз' : 'Пропустить',
        icon: 'skip',
        onSelect: () =>
          run(
            () => skipPlanItem(item),
            `${formatDayMonth(item.date, today)}: операция пропущена`,
            () => reopenPlanItem({ ...item, status: 'skipped', transactionId: null }),
          ),
      });
    } else {
      items.push({
        label: 'Вернуть в план',
        icon: 'undo',
        onSelect: () =>
          run(
            () => reopenPlanItem(item),
            item.status === 'completed'
              ? 'Отметка снята, фактическая операция удалена'
              : 'Операция снова в плане',
          ),
      });
    }
    items.push('separator');
    items.push({
      label: recurring ? 'Изменить повтор' : 'Изменить',
      icon: 'pencil',
      onSelect: () => onEdit(item),
    });
    items.push({
      label: recurring ? 'Удалить повтор' : 'Удалить',
      icon: 'trash',
      danger: true,
      onSelect: () => onDelete(item),
    });
    return items;
  };
}
