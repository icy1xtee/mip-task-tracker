import { X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import type { ReactNode } from 'react';
import { Button } from './Button';

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
};

/** Панель формы: на телефоне — полноэкранная снизу, на desktop — диалог по центру. */
export function Sheet({ open, onOpenChange, title, description, children }: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-ink/30 fixed inset-0 z-40" />
        <Dialog.Content
          className="rounded-t-panel bg-surface sm:rounded-panel fixed inset-x-0 bottom-0 z-50 flex max-h-dvh flex-col overflow-hidden shadow-lg sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2"
          {...(description ? {} : { 'aria-describedby': undefined })}
        >
          <div className="border-line flex items-start justify-between gap-3 border-b px-5 py-4">
            <div>
              <Dialog.Title className="text-ink text-lg font-semibold">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="text-ink-muted mt-1 text-sm">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Закрыть" className="-mt-2 -mr-3">
                <X aria-hidden className="size-5" />
              </Button>
            </Dialog.Close>
          </div>
          <div className="overflow-y-auto px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
