import type { ReactNode } from 'react';
import { cx } from './cx';

export type ChoiceOption<T extends string> = {
  value: T;
  label: ReactNode;
  count?: number;
  /** Знак перед подписью (+/−) — дублирует цвет. */
  sign?: string;
};

type ChoiceProps<T extends string> = {
  options: ChoiceOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
  ariaLabelledBy?: string;
};

/** Сегментированный переключатель (фильтры, тип операции, статус брони). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  ariaLabelledBy,
  full,
}: ChoiceProps<T> & { full?: boolean }) {
  return (
    <div
      className={cx('seg', full && 'seg-full')}
      role="group"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={cx('seg-btn', o.value === value && 'is-on')}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.sign && <span aria-hidden="true">{o.sign}</span>}
          {o.label}
          {o.count !== undefined && <span className="seg-count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** Фильтры-чипы. wrap — переносить строки (в формах), иначе на телефоне горизонтальный скролл. */
export function Chips<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  ariaLabelledBy,
  wrap,
}: ChoiceProps<T> & { wrap?: boolean }) {
  return (
    <div
      className="chips"
      role="group"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      style={wrap ? { flexWrap: 'wrap', overflow: 'visible', margin: 0, padding: 0 } : undefined}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={cx('chip', o.value === value && 'is-on')}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {o.count !== undefined && <span className="seg-count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
