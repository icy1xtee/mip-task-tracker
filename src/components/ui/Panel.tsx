import { Dialog } from 'radix-ui';
import type { FormEvent, ReactNode } from 'react';
import { Button, IconButton } from './Button';
import { FieldError } from './Field';
import { usePortalContainer } from './portal';

type PanelProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  saving: boolean;
  /** Ошибка сохранения — показывается над кнопками, панель остаётся открытой. */
  error?: string | null;
  /** «Удалить» слева в подвале — только при редактировании. */
  onDelete?: () => void;
  children: ReactNode;
};

/**
 * Форма в боковой панели 448px (desktop/планшет) или bottom sheet (телефон).
 * Пока идёт сохранение, панель не закрывается.
 */
export function Panel({
  open,
  onClose,
  title,
  onSubmit,
  submitLabel,
  saving,
  error,
  onDelete,
  children,
}: PanelProps) {
  const container = usePortalContainer();
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && !saving && onClose()}>
      <Dialog.Portal container={container}>
        <Dialog.Overlay className="scrim" />
        <Dialog.Content className="panel" aria-describedby={undefined}>
          <div className="grabber" />
          <div className="panel-head">
            <Dialog.Title className="h2">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <IconButton icon="x" label="Закрыть" disabled={saving} />
            </Dialog.Close>
          </div>
          <form className="panel-form" onSubmit={onSubmit} noValidate>
            <div className="panel-body">
              {children}
              {error && <FieldError>{error}</FieldError>}
            </div>
            <div className="panel-foot">
              {onDelete && (
                <Button variant="ghost-danger" icon="trash" onClick={onDelete} disabled={saving}>
                  Удалить
                </Button>
              )}
              <div className="spacer" />
              <Dialog.Close asChild>
                <Button variant="secondary" className="hide-m" disabled={saving}>
                  Отмена
                </Button>
              </Dialog.Close>
              <Button type="submit" pending={saving}>
                {submitLabel}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
