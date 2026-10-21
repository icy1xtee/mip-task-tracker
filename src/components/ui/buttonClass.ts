import { cx } from './cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'ghost-danger';

/** Классы кнопки дизайн-системы — и для <button>, и для ссылок, оформленных кнопкой. */
export function buttonClass(
  variant: ButtonVariant = 'primary',
  size: 'md' | 'sm' = 'md',
  extra?: string,
) {
  return cx('btn', `btn-${variant}`, size === 'sm' && 'btn-sm', extra);
}
