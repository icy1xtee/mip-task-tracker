import { usePet } from '@/components/pet/usePet';
import { useToast } from '@/components/ui/useToast';
import { getErrorMessage } from '@/lib/firebase/errors';
import type { Task } from '@/types/models';
import { setTaskCompleted } from './api';

/** Отметка выполнения с undo-тостом. Ошибка сохранения показывается, а не скрывается. */
export function useTaskToggle() {
  const toast = useToast();
  const pet = usePet();
  return async (task: Task, done: boolean) => {
    try {
      await setTaskCompleted(task.id, done);
      if (done) pet.cheer();
      toast(done ? 'Дело выполнено' : 'Дело снова в списке', {
        action: done
          ? {
              label: 'Отменить',
              onClick: () => {
                setTaskCompleted(task.id, false).catch((e) =>
                  toast(getErrorMessage(e), { error: true }),
                );
              },
            }
          : undefined,
      });
    } catch (e) {
      toast(getErrorMessage(e), { error: true });
    }
  };
}
