import { AlertDialog } from 'radix-ui';
import { Button } from './Button';
import { FieldError } from './Field';
import { Icon } from './Icon';
import { usePortalContainer } from './portal';

type ConfirmDialogProps = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  text: string;
  confirmLabel?: string;
  pending?: boolean;
  error?: string | null;
};

/** Подтверждение удаления. Не закрывается, пока идёт удаление. */
export function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title,
  text,
  confirmLabel = 'Удалить',
  pending = false,
  error,
}: ConfirmDialogProps) {
  const container = usePortalContainer();
  return (
    <AlertDialog.Root open={open} onOpenChange={(next) => !next && !pending && onCancel()}>
      <AlertDialog.Portal container={container}>
        <AlertDialog.Overlay className="scrim" />
        <div className="dialog-wrap">
          <AlertDialog.Content className="dialog">
            <span className="dialog-ic">
              <Icon name="trash" />
            </span>
            <AlertDialog.Title className="h2" style={{ fontSize: 18, lineHeight: '26px' }}>
              {title}
            </AlertDialog.Title>
            <AlertDialog.Description
              className="sub small"
              style={{ fontSize: 14, lineHeight: '20px' }}
            >
              {text}
            </AlertDialog.Description>
            {error && <FieldError>{error}</FieldError>}
            <div className="dialog-actions">
              <AlertDialog.Cancel asChild>
                <Button variant="secondary" disabled={pending}>
                  Оставить
                </Button>
              </AlertDialog.Cancel>
              <Button
                variant="danger"
                pending={pending}
                pendingLabel="Удаляем…"
                onClick={onConfirm}
              >
                {confirmLabel}
              </Button>
            </div>
          </AlertDialog.Content>
        </div>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
