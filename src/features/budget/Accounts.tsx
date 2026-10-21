import { cx } from '@/components/ui/cx';
import { Icon } from '@/components/ui/Icon';
import type { AccountForecast } from '@/lib/finance/forecast';
import { sumBalances } from '@/lib/finance/forecast';
import { formatDayMonthShort, type IsoDate } from '@/lib/format/dates';
import { formatMoney } from '@/lib/format/money';
import type { Account } from '@/types/models';
import { ACCOUNT_TYPE_LABELS } from './api';
import { accountIcon } from './budgetMeta';

type AccountsProps = {
  balances: AccountForecast[];
  today: IsoDate;
  onEdit: (account: Account) => void;
  onAdd: () => void;
};

/** Итог по счетам и карточки счетов (макет «Бюджет → План»). Долг — отдельно и терракотой. */
export function Accounts({ balances, today, onEdit, onAdd }: AccountsProps) {
  const sum = sumBalances(balances);
  return (
    <section className="section" aria-label="Счета">
      <div className="acc-sum">
        <div className="acc-sum-part">
          <span className="small sub">Итого по счетам</span>
          <span className="big">{formatMoney(sum.net)}</span>
        </div>
        <div className="acc-sum-part">
          <span className="small sub">Деньги на счетах</span>
          <span className="acc-sum-val num">{formatMoney(sum.assets)}</span>
        </div>
        <div className="acc-sum-part">
          <span className="small sub">Долги</span>
          <span className="acc-sum-val num out">{formatMoney(sum.debt)}</span>
        </div>
        <button type="button" className="textlink acc-sum-add" onClick={onAdd}>
          <Icon name="plus" />
          Добавить счёт
        </button>
      </div>
      <div className="accs">
        {balances.map(({ account, balanceMinor, available }) => {
          const debt = balanceMinor < 0;
          const typeLabel = ACCOUNT_TYPE_LABELS[account.type];
          const sub = [
            debt ? 'Долг' : typeLabel !== account.name && typeLabel,
            `остаток на ${formatDayMonthShort(account.balanceAsOfDate, today)}`,
            !available && 'пока не учтён',
          ]
            .filter(Boolean)
            .join(' · ');
          return (
            <button
              type="button"
              key={account.id}
              className={cx('acc', debt && 'is-debt')}
              onClick={() => onEdit(account)}
              aria-label={`${account.name}: ${formatMoney(balanceMinor)}. Изменить счёт`}
            >
              <span className="acc-ic">
                <Icon name={accountIcon(account.type)} />
              </span>
              <div className="acc-text">
                <div className="acc-name">{account.name}</div>
                <div className="acc-sub">{sub}</div>
              </div>
              <div className="acc-amt">
                <span className={cx('money acc-amt', debt && 'debt')}>
                  {formatMoney(balanceMinor)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
