import { useState } from 'react';
import { Button, IconButton } from '@/components/ui/Button';
import { cx } from '@/components/ui/cx';
import { Icon, type IconName } from '@/components/ui/Icon';
import { RowMenu } from '@/components/ui/Menu';
import { EmptyState } from '@/components/ui/States';
import { categoryLabel } from '@/lib/finance/categories';
import {
  addMonthsIso,
  formatDayMonthShort,
  formatInMonth,
  formatMonthColumn,
  formatMonthName,
  formatMonthYear,
  monthGenitive,
  monthOf,
  type IsoDate,
  type IsoMonth,
} from '@/lib/format/dates';
import { formatMoney, formatThousands } from '@/lib/format/money';
import { pl } from '@/lib/format/plural';
import type { Account, Transaction } from '@/types/models';
import { summarizeMonth, type ActualSummary } from './monthSummary';

type ActualViewProps = {
  month: IsoMonth;
  today: IsoDate;
  transactions: Transaction[];
  accounts: Account[];
  onMonth: (month: IsoMonth) => void;
  onAdd: () => void;
  onEdit: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
};

function delta(change: number | null): { cls: string; icon: IconName; label: string } | null {
  if (change === null) return null;
  const up = change >= 5;
  const down = change <= -5;
  return {
    cls: cx('delta', up ? 'up' : down ? 'down' : 'flat'),
    icon: up ? 'arrowUp' : down ? 'arrowDown' : 'minus',
    label: `${change > 0 ? '+' : change < 0 ? '−' : ''}${Math.abs(change)} %`,
  };
}

function Delta({ change }: { change: number | null }) {
  const d = delta(change);
  if (!d) return <span className="delta flat">—</span>;
  return (
    <span className={d.cls}>
      <Icon name={d.icon} />
      {d.label}
    </span>
  );
}

export function ActualView({
  month,
  today,
  transactions,
  accounts,
  onMonth,
  onAdd,
  onEdit,
  onDelete,
}: ActualViewProps) {
  const s = summarizeMonth(transactions, month, today);
  const ops = transactions
    .filter((t) => monthOf(t.date) === month)
    .sort((a, b) =>
      a.date === b.date
        ? (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
        : a.date < b.date
          ? 1
          : -1,
    );
  const hasAnyExpense = transactions.some((t) => t.type === 'expense');
  const canGoNext = month < monthOf(today);
  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? 'Счёт удалён';

  return (
    <>
      <div className="toolbar">
        <div className="month-switch" role="group" aria-label="Месяц">
          <IconButton
            icon="chevL"
            label="Предыдущий месяц"
            onClick={() => onMonth(addMonthsIso(month, -1))}
          />
          <span className="month-label" aria-live="polite">
            {formatMonthYear(month)}
          </span>
          <IconButton
            icon="chevR"
            label="Следующий месяц"
            onClick={() => onMonth(addMonthsIso(month, 1))}
            disabled={!canGoNext}
          />
        </div>
        {month !== monthOf(today) && (
          <Button variant="ghost" size="sm" onClick={() => onMonth(monthOf(today))}>
            К текущему месяцу
          </Button>
        )}
      </div>

      {!hasAnyExpense ? (
        <EmptyState
          icon="wallet"
          text="Пока нет фактических трат. Добавляйте их по ходу месяца — здесь появятся суммы по категориям и динамика."
          action={
            accounts.length ? (
              <Button icon="plus" onClick={onAdd}>
                Добавить трату
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <Stats s={s} />
          <div className="split-even">
            <Categories s={s} />
            <Months key={s.month} s={s} />
          </div>
        </>
      )}

      {ops.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2 className="h2">Операции за {formatMonthName(month).toLowerCase()}</h2>
            <span className="small muted">
              {ops.length} {pl(ops.length, 'операция', 'операции', 'операций')}
            </span>
          </div>
          <div className="list">
            {ops.map((t) => (
              <div className="op" key={t.id}>
                <span className="exp-date">{formatDayMonthShort(t.date, today)}</span>
                <div className="row-main">
                  <div className="op-title">{t.note ?? categoryLabel(t.category)}</div>
                  <div className="row-meta">
                    <span>
                      {[
                        t.type === 'income'
                          ? 'Поступление'
                          : t.note &&
                            t.note !== categoryLabel(t.category) &&
                            categoryLabel(t.category),
                        accountName(t.accountId),
                        (t.plannedEntryId || t.recurringOccurrenceId) && 'из плана',
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </div>
                </div>
                <span className={cx('money', t.type === 'income' && 'in')}>
                  {t.type === 'income' ? '+' : ''}
                  {formatMoney(t.amountMinor)}
                </span>
                <RowMenu
                  label={`Действия: ${t.note ?? categoryLabel(t.category)}`}
                  items={[
                    { label: 'Изменить', icon: 'pencil', onSelect: () => onEdit(t) },
                    { label: 'Удалить', icon: 'trash', danger: true, onSelect: () => onDelete(t) },
                  ]}
                />
              </div>
            ))}
          </div>
        </section>
      )}
      {hasAnyExpense && ops.length === 0 && (
        <div className="empty-inline">В этом месяце операций нет.</div>
      )}
    </>
  );
}

function Stats({ s }: { s: ActualSummary }) {
  const prevMonth = addMonthsIso(s.month, -1);
  const projChange =
    s.projectionMinor !== null && s.averageMinor
      ? Math.round(((s.projectionMinor - s.averageMinor) / s.averageMinor) * 100)
      : null;
  const avgChange =
    !s.isCurrent && s.averageMinor
      ? Math.round(((s.totalMinor - s.averageMinor) / s.averageMinor) * 100)
      : null;
  return (
    <div className="stats">
      <div className="stat">
        <span className="small sub">
          {s.isCurrent
            ? `Потрачено с 1 по ${s.periodEndDay} ${monthGenitive(s.month)}`
            : `Потрачено за ${formatMonthName(s.month).toLowerCase()}`}
        </span>
        <span className="stat-val">{formatMoney(s.totalMinor)}</span>
        <span className="stat-note">
          {s.count} {pl(s.count, 'трата', 'траты', 'трат')}
        </span>
      </div>
      <div className="stat">
        <span className="small sub">
          {s.isCurrent
            ? `За тот же период ${monthGenitive(prevMonth)}`
            : `За ${formatMonthName(prevMonth).toLowerCase()}`}
        </span>
        {s.previousMinor !== null ? (
          <>
            <span className="stat-val" style={{ color: 'var(--ink-2)' }}>
              {formatMoney(s.previousMinor)}
            </span>
            <span className="stat-note">
              <Delta change={s.previousChange} />
              {s.previousChange !== null &&
                (s.previousChange >= 0
                  ? `${formatInMonth(s.month)} больше`
                  : `${formatInMonth(s.month)} меньше`)}
            </span>
          </>
        ) : (
          <>
            <span className="stat-val" style={{ color: 'var(--ink-3)' }}>
              —
            </span>
            <span className="stat-note">Нет данных — сравнивать не с чем</span>
          </>
        )}
      </div>
      <div className="stat">
        {s.isCurrent ? (
          <>
            <span className="small sub">Если темп сохранится, за месяц</span>
            <span className="stat-val">
              {s.projectionMinor !== null ? `≈ ${formatMoney(s.projectionMinor)}` : '—'}
            </span>
            <span className="stat-note">
              {s.averageMinor ? (
                <>
                  <Delta change={projChange} />к среднему месяцу ({formatMoney(s.averageMinor)})
                </>
              ) : (
                'Средний месяц появится, когда накопится история'
              )}
            </span>
          </>
        ) : (
          <>
            <span className="small sub">
              Среднее за {s.averageMonths || ''} {pl(s.averageMonths, 'месяц', 'месяца', 'месяцев')}{' '}
              до этого
            </span>
            <span className="stat-val">{s.averageMinor ? formatMoney(s.averageMinor) : '—'}</span>
            <span className="stat-note">
              {s.averageMinor ? (
                <>
                  <Delta change={avgChange} />
                  {formatInMonth(s.month)} к среднему
                </>
              ) : (
                'Более ранних данных нет'
              )}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function Categories({ s }: { s: ActualSummary }) {
  const scale =
    Math.max(1, ...s.categories.map((c) => Math.max(c.currentMinor, c.previousMinor ?? 0))) * 1.06;
  const prevMonth = addMonthsIso(s.month, -1);
  const hasPrev = s.previousMinor !== null;
  return (
    <section className="block">
      <div className="section-head">
        <h2 className="h2">По категориям</h2>
        <span className="small muted">
          {s.isCurrent ? `1–${s.periodEndDay} число` : 'весь месяц'}
        </span>
      </div>
      <div className="legend">
        <span>
          <span className="lg-sw" style={{ background: 'var(--chart)' }} />
          {formatMonthName(s.month)}
        </span>
        {hasPrev && (
          <>
            <span>
              <span className="lg-tick" />
              {formatMonthName(prevMonth)}
              {s.isCurrent ? ', тот же период' : ''}
            </span>
            <span>
              <Icon name="arrowUp" size="sm" className="out" />
              рост · <Icon name="arrowDown" size="sm" className="in" />
              снижение
            </span>
          </>
        )}
      </div>
      {s.categories.length ? (
        <div className="cats">
          {s.categories.map((c) => {
            const name = categoryLabel(c.id);
            const tip = `${name}: ${formatMoney(c.currentMinor)}${c.previousMinor !== null ? ` против ${formatMoney(c.previousMinor)} ${formatInMonth(prevMonth)}` : ''}`;
            return (
              <div className="cat" title={tip} key={c.id}>
                <span className="cat-name">{name}</span>
                <span className="bar-track" role="img" aria-label={tip}>
                  <span
                    className="bar"
                    style={{ width: `${((c.currentMinor / scale) * 100).toFixed(1)}%` }}
                  />
                  {c.previousMinor !== null && c.previousMinor > 0 && (
                    <span
                      className="bar-prev"
                      style={{ left: `${((c.previousMinor / scale) * 100).toFixed(1)}%` }}
                    />
                  )}
                </span>
                <span className="money">{formatMoney(c.currentMinor)}</span>
                <Delta change={c.change} />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-inline">В этом месяце трат пока нет.</div>
      )}
    </section>
  );
}

function Months({ s }: { s: ActualSummary }) {
  const selectedIndex = s.months.findIndex((m) => m.isSelected);
  const [hover, setHover] = useState(selectedIndex);
  const showProjection =
    s.isCurrent && s.projectionMinor !== null && s.projectionMinor > s.totalMinor;
  const max = Math.max(1, s.projectionMinor ?? 0, ...s.months.map((m) => m.totalMinor)) * 1.14;
  const pctOf = (v: number) => `${((v / max) * 100).toFixed(1)}%`;
  const hm = s.months[hover] ?? s.months[selectedIndex];

  let readout = 'История появится, когда накопятся траты за несколько месяцев.';
  if (hm?.isSelected && s.isCurrent && s.projectionMinor !== null) {
    const pa = s.averageMinor
      ? Math.round(((s.projectionMinor - s.averageMinor) / s.averageMinor) * 100)
      : null;
    readout = `${formatMonthName(hm.month)}, 1–${s.periodEndDay} число: ${formatMoney(hm.totalMinor)}. Если тратить в том же темпе, месяц закончится около ${formatMoney(s.projectionMinor)}${
      pa !== null ? ` — ${pa >= 0 ? `на ${pa} % выше` : `на ${Math.abs(pa)} % ниже`} среднего` : ''
    }.`;
  } else if (hm) {
    const i = s.months.indexOf(hm);
    const prev = s.months[i - 1];
    const pm =
      prev && prev.totalMinor > 0
        ? Math.round(((hm.totalMinor - prev.totalMinor) / prev.totalMinor) * 100)
        : null;
    readout = `${formatMonthName(hm.month)}: ${formatMoney(hm.totalMinor)}${
      pm !== null && prev
        ? ` — ${pm >= 0 ? `на ${pm} % больше` : `на ${Math.abs(pm)} % меньше`}, чем ${formatInMonth(prev.month)}`
        : ''
    }.`;
  }

  return (
    <section className="block">
      <div className="section-head">
        <h2 className="h2">По месяцам</h2>
        <span className="small muted">тыс. ₽</span>
      </div>
      <div className="legend">
        {s.months.length > 1 && (
          <span>
            <span className="lg-sw" style={{ background: 'var(--bar-past)' }} />
            Полный месяц
          </span>
        )}
        <span>
          <span className="lg-sw" style={{ background: 'var(--accent)' }} />
          {formatMonthName(s.month)}
          {s.isCurrent ? `, 1–${s.periodEndDay}` : ''}
        </span>
        {showProjection && (
          <span>
            <span className="lg-hatch" />
            Прогноз до конца
          </span>
        )}
        {s.averageMinor !== null && (
          <span>
            <span className="lg-dash" />
            Среднее за {s.averageMonths} мес.
          </span>
        )}
      </div>
      <div>
        <div
          className="plot"
          style={{ gridTemplateColumns: `repeat(${Math.max(s.months.length, 6)}, minmax(0, 1fr))` }}
        >
          {s.averageMinor !== null && (
            <div className="avg" style={{ bottom: pctOf(s.averageMinor) }} />
          )}
          {s.months.map((m, i) => (
            <button
              type="button"
              key={m.month}
              className={cx('col', m.isSelected && 'is-cur', i === hover && 'is-hover')}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onClick={() => setHover(i)}
              aria-label={`${formatMonthName(m.month)}: ${formatMoney(m.totalMinor)}${m.isSelected && showProjection ? `, прогноз ${formatMoney(s.projectionMinor!)}` : ''}`}
            >
              <span className="col-val">{formatThousands(m.totalMinor)}</span>
              {m.isSelected && showProjection && (
                <span
                  className="col-proj"
                  style={{ height: pctOf(s.projectionMinor! - m.totalMinor) }}
                />
              )}
              <span className="col-bar" style={{ height: pctOf(m.totalMinor) }} />
            </button>
          ))}
        </div>
        <div
          className="xlabels"
          style={{ gridTemplateColumns: `repeat(${Math.max(s.months.length, 6)}, minmax(0, 1fr))` }}
        >
          {s.months.map((m) => (
            <span key={m.month} className={m.isSelected ? 'is-cur' : undefined}>
              {formatMonthColumn(m.month)}
            </span>
          ))}
        </div>
      </div>
      <div className="readout" aria-live="polite">
        {readout}
      </div>
    </section>
  );
}
