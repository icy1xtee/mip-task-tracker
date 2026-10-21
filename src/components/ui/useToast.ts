import { createContext, useContext } from 'react';

export type ToastAction = { label: string; onClick: () => void };
export type ShowToast = (text: string, options?: { action?: ToastAction; error?: boolean }) => void;

export const ToastContext = createContext<ShowToast | null>(null);

export function useToast(): ShowToast {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast используется вне ToastProvider');
  return show;
}
