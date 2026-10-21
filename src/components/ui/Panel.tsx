import { Dialog } from 'radix-ui';
import type { FormEvent, ReactNode } from 'react';
import { Button, IconButton } from './Button';
import { CopyButton } from './CopyButton';
import { FieldError } from './Field';
import { usePortalContainer } from './portal';
import { useSheetDrag } from './useSheetDrag';

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
  /** Квадратная кнопка «Копировать» рядом с «Сохранить»: текст собирается в момент нажатия. */
  copyText?: () => string;
  children: ReactNode;
};

/**
 * Форма в боковой панели 448px (desktop/планшет) или bottom sheet (телефон).
 * Пока идёт сохранение, панель не закрывается. На телефоне закрывается и свайпом вниз.
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
  copyText,
  children,
}: PanelProps) {
  const container = usePortalContainer();
  const { contentRef, overlayRef, dragHandlers } = useSheetDrag({ enabled: !saving, onClose });
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && !saving && onClose()}>
      <Dialog.Portal container={container}>
        <Dialog.Overlay className="scrim" ref={overlayRef} />
        <Dialog.Content className="panel" aria-describedby={undefined} ref={contentRef}>
          <div className="panel-drag" {...dragHandlers}>
            <div className="grabber" />
            <div className="panel-head">
              <Dialog.Title className="h2">{title}</Dialog.Title>
              <Dialog.Close asChild>
                <IconButton icon="x" label="Закрыть" disabled={saving} />
              </Dialog.Close>
            </div>
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
              {copyText && <CopyButton getText={copyText} label="Скопировать всё в буфер обмена" />}
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

type ViewPanelProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Кнопки в заголовке рядом с «Закрыть» (например, меню «…»). */
  headerActions?: ReactNode;
  /** Подвал с действиями; без него панель — просто карточка для чтения. */
  footer?: ReactNode;
  children: ReactNode;
};

/** Та же боковая панель / bottom sheet, но для просмотра карточки, а не формы. */
export function ViewPanel({
  open,
  onClose,
  title,
  headerActions,
  footer,
  children,
}: ViewPanelProps) {
  const container = usePortalContainer();
  const { contentRef, overlayRef, dragHandlers } = useSheetDrag({ enabled: true, onClose });
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal container={container}>
        <Dialog.Overlay className="scrim" ref={overlayRef} />
        <Dialog.Content className="panel" aria-describedby={undefined} ref={contentRef}>
          <div className="panel-drag" {...dragHandlers}>
            <div className="grabber" />
            <div className="panel-head">
              <Dialog.Title className="h2">{title}</Dialog.Title>
              <div className="panel-head-actions">
                {headerActions}
                <Dialog.Close asChild>
                  <IconButton icon="x" label="Закрыть" />
                </Dialog.Close>
              </div>
            </div>
          </div>
          <div className="panel-body">{children}</div>
          {footer && <div className="panel-foot">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
