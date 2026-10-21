import type { ReactNode } from 'react';
import { cx } from './cx';
import { Icon, type IconName } from './Icon';

export type TagTone = 'neutral' | 'positive' | 'accent' | 'clay' | 'amber' | 'outline';

export function Tag({
  tone = 'neutral',
  icon,
  children,
}: {
  tone?: TagTone;
  icon?: IconName;
  children: ReactNode;
}) {
  return (
    <span className={cx('tag', tone !== 'neutral' && `tag-${tone}`)}>
      {icon && <Icon name={icon} />}
      {children}
    </span>
  );
}
