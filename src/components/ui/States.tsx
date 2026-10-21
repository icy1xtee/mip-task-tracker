import type { ReactNode } from 'react';
import { getLoadErrorMessage } from '@/lib/firebase/errors';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

export function LoadingState({ label = 'Загружаем…' }: { label?: string }) {
  return (
    <div className="loading" role="status">
      <span className="spinner is-dark" aria-hidden="true" />
      {label}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div className="empty" role="alert">
      <span className="empty-ic" style={{ background: 'var(--clay-soft)', color: 'var(--clay)' }}>
        <Icon name="alert" />
      </span>
      <p>{getLoadErrorMessage(error)}</p>
      <Button variant="secondary" onClick={onRetry}>
        Повторить
      </Button>
    </div>
  );
}

export function EmptyState({
  icon,
  text,
  action,
}: {
  icon: IconName;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-ic">
        <Icon name={icon} />
      </span>
      <p>{text}</p>
      {action}
    </div>
  );
}

/** Единый паттерн экрана: загрузка → ошибка → содержимое. */
export function DataView({
  state,
  children,
}: {
  state: { status: 'loading' | 'ready' | 'error'; error: unknown; retry: () => void };
  children: () => ReactNode;
}) {
  if (state.status === 'loading') return <LoadingState />;
  if (state.status === 'error') return <ErrorState error={state.error} onRetry={state.retry} />;
  return <>{children()}</>;
}
