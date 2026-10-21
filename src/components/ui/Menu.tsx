import { DropdownMenu } from 'radix-ui';
import { cx } from './cx';
import { Icon, type IconName } from './Icon';
import { usePortalContainer } from './portal';

export type MenuItem =
  | { label: string; icon: IconName; onSelect: () => void; danger?: boolean; disabled?: boolean }
  | 'separator';

type RowMenuProps = {
  label: string;
  items: MenuItem[];
  /** Крупная цель нажатия на телефоне берётся из .icon-btn в дизайн-системе. */
  triggerClassName?: string;
};

/** Меню «…» для редких действий строки или карточки. */
export function RowMenu({ label, items, triggerClassName }: RowMenuProps) {
  const container = usePortalContainer();
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={cx('icon-btn', triggerClassName)}
          aria-label={label}
          title={label}
        >
          <Icon name="more" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal container={container}>
        <DropdownMenu.Content className="menu" align="end" sideOffset={4} collisionPadding={8}>
          {items.map((item, i) =>
            item === 'separator' ? (
              <DropdownMenu.Separator key={`sep-${i}`} className="menu-sep" />
            ) : (
              <DropdownMenu.Item
                key={item.label}
                className={cx('menu-item', item.danger && 'danger')}
                disabled={item.disabled}
                onSelect={item.onSelect}
              >
                <Icon name={item.icon} />
                {item.label}
              </DropdownMenu.Item>
            ),
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
