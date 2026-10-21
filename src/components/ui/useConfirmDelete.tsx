import { useState } from 'react';
import { getErrorMessage } from '@/lib/firebase/errors';
import { ConfirmDialog } from './ConfirmDialog';
import { useToast } from './useToast';

type Options<T> = {
  title: (item: T) => string;
  text: (item: T) => string;
  remove: (item: T) => Promise<unknown>;
  doneMessage: string;
  onDone?: () => void;
};

/** Подтверждение удаления: состояние диалога, ожидание, ошибка и тост об успехе. */
export function useConfirmDelete<T>({ title, text, remove, doneMessage, onDone }: Options<T>) {
  const toast = useToast();
  const [target, setTarget] = useState<T | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    if (target === null) return;
    setPending(true);
    setError(null);
    try {
      await remove(target);
      setTarget(null);
      toast(doneMessage);
      onDone?.();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setPending(false);
    }
  };

  const dialog = (
    <ConfirmDialog
      open={target !== null}
      title={target !== null ? title(target) : ''}
      text={target !== null ? text(target) : ''}
      pending={pending}
      error={error}
      onConfirm={confirm}
      onCancel={() => {
        setTarget(null);
        setError(null);
      }}
    />
  );

  return { ask: (item: T) => setTarget(() => item), dialog, isOpen: target !== null };
}
