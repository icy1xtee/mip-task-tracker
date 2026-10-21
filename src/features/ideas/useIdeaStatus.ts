import { useToast } from '@/components/ui/useToast';
import { getErrorMessage } from '@/lib/firebase/errors';
import type { Activity, ActivityStatus } from '@/types/models';
import { setActivityStatus } from './api';

const MESSAGES: Record<ActivityStatus, string> = {
  booked: 'Отмечено как забронированное',
  wishlist: 'Идея снова в списке',
  completed: 'Отмечено: сходили',
  archived: 'Идея в архиве',
};

/** Смена статуса идеи с undo-тостом. */
export function useIdeaStatus() {
  const toast = useToast();
  return async (idea: Activity, status: ActivityStatus) => {
    const previous = idea.status;
    try {
      await setActivityStatus(idea.id, status);
      toast(idea.status === 'booked' && status === 'wishlist' ? 'Бронь снята' : MESSAGES[status], {
        action: {
          label: 'Отменить',
          onClick: () => {
            setActivityStatus(idea.id, previous).catch((e) =>
              toast(getErrorMessage(e), { error: true }),
            );
          },
        },
      });
    } catch (e) {
      toast(getErrorMessage(e), { error: true });
    }
  };
}
