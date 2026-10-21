import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import { ToastContext, type ShowToast, type ToastAction } from './useToast';

type ToastState = { id: number; text: string; action: ToastAction | null; error: boolean } | null;

const TOAST_MS = 3400;

/** Уведомление снизу по центру (на телефоне — над нижней навигацией), role="status". */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback<ShowToast>((text, options) => {
    clearTimeout(timer.current);
    const id = Date.now();
    setToast({ id, text, action: options?.action ?? null, error: options?.error ?? false });
    const ms = options?.action || options?.error ? TOAST_MS + 2000 : TOAST_MS;
    timer.current = setTimeout(() => setToast((t) => (t?.id === id ? null : t)), ms);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext value={show}>
      {children}
      <div aria-live="polite">
        {toast && (
          <div className="toast" role={toast.error ? 'alert' : 'status'} key={toast.id}>
            <Icon
              name={toast.error ? 'alert' : 'check'}
              className={toast.error ? 'toast-ic-error' : undefined}
            />
            <span className="toast-text">{toast.text}</span>
            {toast.action && (
              <button
                type="button"
                className="toast-btn"
                onClick={() => {
                  setToast(null);
                  toast.action?.onClick();
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext>
  );
}
