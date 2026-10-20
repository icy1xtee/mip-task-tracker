import { AlertDialog } from 'radix-ui';
import { Button } from './Button';

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
};

/** Подтверждение необратимого действия (удаление). Не закрывается, пока идёт сохранение. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Удалить',
  pending = false,
  error,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="bg-ink/30 fixed inset-0 z-40" />
        <AlertDialog.Content className="rounded-panel bg-surface fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 p-5 shadow-lg">
          <AlertDialog.Title className="text-ink text-lg font-semibold">{title}</AlertDialog.Title>
          <AlertDialog.Description className="text-ink-muted mt-2 text-sm">
            {description}
          </AlertDialog.Description>
          {error && (
            <p role="alert" className="text-danger mt-3 text-sm">
              {error}
            </p>
          )}
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary" disabled={pending}>
                Отмена
              </Button>
            </AlertDialog.Cancel>
            <Button variant="danger" pending={pending} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
