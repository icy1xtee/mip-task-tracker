import { Icon } from './Icon';

type TaskCheckProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
};

/** Чекбокс задачи: зона нажатия 44×44. */
export function TaskCheck({ checked, onChange, label, disabled }: TaskCheckProps) {
  return (
    <label className="check">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
      />
      <span className="check-box">
        <Icon name="check" />
      </span>
    </label>
  );
}
