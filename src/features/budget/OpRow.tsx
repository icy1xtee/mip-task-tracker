import { cx } from '@/components/ui/cx';
import { Icon } from '@/components/ui/Icon';
import { RowMenu, type MenuItem } from '@/components/ui/Menu';
import { Tag } from '@/components/ui/Tag';
import { signedAmount, type PlanItem } from '@/lib/finance/plan';
import { formatSignedMoney } from '@/lib/format/money';

type OpRowProps = {
  item: PlanItem;
  meta: string;
  menu?: MenuItem[];
};

/** Строка плановой операции: знак и цвет дублируются иконкой «+/−», статус — тегом. */
export function OpRow({ item, meta, menu }: OpRowProps) {
  const income = item.type === 'income';
  return (
    <div
      className={cx(
        'op',
        item.status === 'skipped' && 'is-skipped',
        item.status === 'completed' && 'is-done',
      )}
    >
      <span className={cx('op-ic', income ? 'in' : 'out')}>
        <Icon name={income ? 'plus' : 'minus'} />
      </span>
      <div className="row-main">
        <div className="op-title">{item.title}</div>
        <div className="row-meta">
          {item.status === 'completed' && (
            <Tag tone="positive" icon="check">
              {income ? 'Получено' : 'Оплачено'}
            </Tag>
          )}
          {item.status === 'skipped' && <Tag>Пропущено</Tag>}
          <span>{meta}</span>
        </div>
      </div>
      <span className={cx('money', income ? 'in' : 'out-c')}>
        {formatSignedMoney(signedAmount(item))}
      </span>
      {menu && <RowMenu label={`Действия: ${item.title}`} items={menu} />}
    </div>
  );
}
