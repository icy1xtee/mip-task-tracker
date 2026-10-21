import { useId, type ComponentProps, type ReactNode } from 'react';
import { cx } from './cx';
import { Icon } from './Icon';

type ControlProps = { id: string; 'aria-invalid'?: true; 'aria-describedby'?: string };

type FieldProps = {
  label: string;
  /** Подпись необязательности, например «если есть» → «Стоимость · если есть». */
  optional?: string;
  error?: string;
  hint?: string;
  children: (props: ControlProps) => ReactNode;
};

/** Подпись, подсказка и ошибка поля, связанные с контролом через id/aria. */
export function Field({ label, optional, error, hint, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
        {optional && <span className="opt"> · {optional}</span>}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {error && <FieldError id={errorId}>{error}</FieldError>}
      {hint && (
        <p id={hintId} className="hint">
          {hint}
        </p>
      )}
    </div>
  );
}

export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <div id={id} className="err" role="alert">
      <Icon name="alert" />
      {children}
    </div>
  );
}

type InputProps = ComponentProps<'input'> & { invalid?: boolean };

export function TextInput({ className, invalid, ...props }: InputProps) {
  return (
    <input
      className={cx('input', (invalid || props['aria-invalid']) && 'is-error', className)}
      {...props}
    />
  );
}

export function TextArea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea className={cx('input', props['aria-invalid'] && 'is-error', className)} {...props} />
  );
}

export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <div className="select-wrap">
      <select className={cx('input', className)} {...props}>
        {children}
      </select>
      <Icon name="chevD" />
    </div>
  );
}

/**
 * Календарная дата. Нативный пикер браузера, но размеры и иконка — дизайн-системы:
 * iOS Safari иначе растягивает поле по тексту даты и не показывает иконку.
 */
export function DateInput({ className, ...props }: Omit<InputProps, 'type'>) {
  return (
    <div className="date-wrap">
      <input
        type="date"
        className={cx('input input-date', props['aria-invalid'] && 'is-error', className)}
        {...props}
      />
      <Icon name="calendar" />
    </div>
  );
}

/** Сумма в рублях: текстовое поле с суффиксом ₽ (крупное — для форм операций). */
export function MoneyInput({ large, className, ...props }: InputProps & { large?: boolean }) {
  return (
    <div className="affix-wrap">
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0"
        className={cx(
          'input has-affix num',
          large && 'input-lg',
          props['aria-invalid'] && 'is-error',
          className,
        )}
        {...props}
      />
      <span className="affix" aria-hidden="true">
        ₽
      </span>
    </div>
  );
}

export function SearchInput({ className, ...props }: ComponentProps<'input'>) {
  return (
    <div className={cx('search-wrap', className)}>
      <Icon name="search" />
      <input type="search" className="input" {...props} />
    </div>
  );
}
