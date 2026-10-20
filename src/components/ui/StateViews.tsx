import { CircleAlert, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { Spinner } from './Spinner';

export function LoadingState({ label = 'Загрузка…' }: { label?: string }) {
  return (
    <div role="status" className="text-ink-muted flex items-center justify-center gap-2 py-16">
      <Spinner />
      <span className="text-sm">{label}</span>
    </div>
  );
}

type ErrorStateProps = { title?: string; message: string; onRetry?: () => void };

export function ErrorState({ title = 'Не удалось загрузить', message, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-16 text-center">
      <CircleAlert aria-hidden className="text-danger size-8" />
      <div>
        <p className="text-ink font-medium">{title}</p>
        <p className="text-ink-muted mt-1 text-sm">{message}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Повторить
        </Button>
      )}
    </div>
  );
}

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-panel border-line-strong flex flex-col items-center gap-3 border border-dashed px-6 py-14 text-center">
      <Icon aria-hidden className="text-ink-subtle size-8" />
      <div>
        <p className="text-ink font-medium">{title}</p>
        {description && <p className="text-ink-muted mt-1 max-w-sm text-sm">{description}</p>}
      </div>
      {action}
    </div>
  );
}
