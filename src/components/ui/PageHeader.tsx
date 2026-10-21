import type { ReactNode } from 'react';

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  lead?: ReactNode;
  /** Кнопки шапки. Основной CTA обычно скрыт на телефоне — там его роль у «+» в верхней панели. */
  actions?: ReactNode;
  actionsMobile?: boolean;
};

export function PageHeader({ eyebrow, title, lead, actions, actionsMobile }: PageHeaderProps) {
  return (
    <div className={lead || actionsMobile ? 'page-head' : 'page-head hide-m'}>
      <div>
        {eyebrow && <div className="eyebrow hide-m">{eyebrow}</div>}
        <h1 className="h1 hide-m">{title}</h1>
        {lead && <p className="lead">{lead}</p>}
      </div>
      {actions && (
        <div className={actionsMobile ? 'ph-actions' : 'ph-actions hide-m'}>{actions}</div>
      )}
    </div>
  );
}
