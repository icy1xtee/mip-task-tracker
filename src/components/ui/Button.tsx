import type { ComponentProps } from 'react';
import { buttonClass, type ButtonVariant } from './buttonClass';
import { cx } from './cx';
import { Icon, type IconName } from './Icon';

type ButtonProps = ComponentProps<'button'> & {
  variant?: ButtonVariant;
  size?: 'md' | 'sm';
  icon?: IconName;
  /** Показывает спиннер и текст «Сохраняем…»; кнопка недоступна. */
  pending?: boolean;
  pendingLabel?: string;
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  pending = false,
  pendingLabel = 'Сохраняем…',
  disabled,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass(variant, size, className)}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      {...props}
    >
      {pending ? (
        <>
          <span className="spinner" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        <>
          {icon && <Icon name={icon} />}
          {children}
        </>
      )}
    </button>
  );
}

type IconButtonProps = ComponentProps<'button'> & {
  icon: IconName;
  label: string;
  primary?: boolean;
};

export function IconButton({
  icon,
  label,
  primary,
  className,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={cx('icon-btn', primary && 'icon-btn-primary', className)}
      aria-label={label}
      title={label}
      {...props}
    >
      <Icon name={icon} />
    </button>
  );
}

/** Ссылка-кнопка во внешний ресурс: всегда новая вкладка с безопасными атрибутами. */
export function ExternalLink({
  href,
  className,
  children,
  ...props
}: Omit<ComponentProps<'a'>, 'target' | 'rel'> & { href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} {...props}>
      {children}
      <span className="sr-only"> (в новой вкладке)</span>
    </a>
  );
}
