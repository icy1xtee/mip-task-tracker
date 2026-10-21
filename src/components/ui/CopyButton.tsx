import { useEffect, useRef, useState } from 'react';
import { copyText } from '@/lib/clipboard';
import { buttonClass } from './buttonClass';
import { cx } from './cx';
import { Icon } from './Icon';
import { useToast } from './useToast';

type CopyButtonProps = {
  /** Текст собирается в момент нажатия — из текущих значений. */
  getText: () => string;
  label: string;
  size?: 'md' | 'sm';
  className?: string;
};

/** Квадратная кнопка «Копировать»: после успеха на секунду показывает галочку и тост. */
export function CopyButton({ getText, label, size = 'md', className }: CopyButtonProps) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const onClick = async () => {
    try {
      await copyText(getText());
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
      toast('Скопировано в буфер обмена');
    } catch {
      toast('Не удалось скопировать. Разрешите доступ к буферу обмена и попробуйте ещё раз.', {
        error: true,
      });
    }
  };

  return (
    <button
      type="button"
      className={buttonClass('secondary', size, cx('btn-square', className))}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <Icon name={copied ? 'check' : 'copy'} />
    </button>
  );
}
