import { Icon } from '@/components/ui/Icon';
import type { MenuItem } from '@/components/ui/Menu';
import { Tag } from '@/components/ui/Tag';
import type { ForecastInput } from '@/lib/finance/forecast';
import type { PlanItem } from '@/lib/finance/plan';
import { formatDayMonth, formatWeekdayDayMonth, type IsoDate } from '@/lib/format/dates';
import { formatMoney, formatSignedMoney } from '@/lib/format/money';
import { pl } from '@/lib/format/plural';
import { cx } from '@/components/ui/cx';
import { forecastBreakdown } from './forecastView';
import { planItemMeta } from './budgetMeta';
import { OpRow } from './OpRow';

type DayPanelProps = {
  date: IsoDate;
  today: IsoDate;
  input: ForecastInput;
  items: PlanItem[];
  menuFor: (item: PlanItem) => MenuItem[];
  onPlan: () => void;
};

/** Выбранный день: прогноз на конец дня с формулой и операции дня. */
export function DayPanel({ date, today, input, items, menuFor, onPlan }: DayPanelProps) {
  const isPast = date < today;
  const isToday = date === today;
  const range = isToday ? 'сегодня' : `по ${formatDayMonth(date, today)}`;

  return (
    <aside className="daypanel" aria-live="polite" aria-label="Выбранный день">
      <div className="dp-head">
        <div>
          <div className="eyebrow">Выбранный день</div>
          <h2 className="h2">
            {isToday
              ? `Сегодня, ${formatDayMonth(date, today)}`
              : formatWeekdayDayMonth(date, today)}
          </h2>
        </div>
        {isPast && <Tag>День прошёл</Tag>}
        {isToday && <Tag tone="accent">Сегодня</Tag>}
      </div>

      {isPast ? (
        <p className="small sub">
          Операции этого дня уже отражены в остатках счетов, поэтому прогноз для него не считается.
        </p>
      ) : input.accounts.length > 0 ? (
        <Forecast date={date} today={today} input={input} range={range} />
      ) : (
        <div className="empty-inline">Добавьте счёт, чтобы видеть прогноз баланса.</div>
      )}

      <div className="section-head">
        <h3 className="h3">Операции дня</h3>
        {input.accounts.length > 0 && (
          <button type="button" className="textlink" onClick={onPlan}>
            <Icon name="plus" />
            Запланировать
          </button>
        )}
      </div>
      {items.length > 0 ? (
        <div className="ops-plain">
          {items.map((i) => (
            <OpRow key={i.key} item={i} meta={planItemMeta(i, input.accounts)} menu={menuFor(i)} />
          ))}
        </div>
      ) : (
        <div className="empty-inline">На этот день ничего не запланировано.</div>
      )}
    </aside>
  );
}

function Forecast({
  date,
  today,
  input,
  range,
}: {
  date: IsoDate;
  today: IsoDate;
  input: ForecastInput;
  range: string;
}) {
  const b = forecastBreakdown(input, date, today);
  const unavailable = b.forecast.accounts.filter((a) => !a.available);
  const shown = b.forecast.accounts.filter((a) => a.available);
  const hint = b.count
    ? `Учтено ${b.count} ${pl(b.count, 'запланированная операция', 'запланированные операции', 'запланированных операций')}${
        b.overdueCount ? `, из них ${b.overdueCount} за прошедшие дни ещё не отмечены` : ''
      }. Фактические траты, которые ещё не внесены, в прогноз не попадают.`
    : 'На этот период нет запланированных операций — прогноз равен текущему остатку.';

  if (shown.length === 0) {
    return (
      <div className="empty-inline">
        Прогноз доступен начиная с даты фиксации баланса счетов —{' '}
        {formatDayMonth(unavailable[0]!.account.balanceAsOfDate, today)}.
      </div>
    );
  }

  return (
    <>
      <div className="forecast">
        <span className="small sub">Прогноз на конец дня</span>
        <span className="big">{formatMoney(b.forecast.totalMinor)}</span>
        <div className="formula">
          <div className="f-row">
            <span>
              <span className="f-op" />
              Сейчас на счетах, с учётом долга
            </span>
            <span className="num">{formatMoney(b.nowMinor)}</span>
          </div>
          <div className="f-row">
            <span>
              <span className="f-op">+</span>Поступления {range}
            </span>
            <span className="num in">{formatSignedMoney(b.incomeMinor)}</span>
          </div>
          <div className="f-row">
            <span>
              <span className="f-op">−</span>Траты {range}
            </span>
            <span className="num out">{formatMoney(b.expenseMinor)}</span>
          </div>
        </div>
        {shown.length > 1 && (
          <div className="forecast-accs">
            {shown.map((a) => (
              <div className="kv" key={a.account.id}>
                <span className="kv-name">{a.account.name}</span>
                <span className={cx('money', a.balanceMinor < 0 && 'debt')}>
                  {formatMoney(a.balanceMinor)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="hint">{hint}</p>
      {unavailable.length > 0 && (
        <p className="hint">
          Не учтены:{' '}
          {unavailable
            .map(
              (a) =>
                `«${a.account.name}» (баланс зафиксирован на ${formatDayMonth(a.account.balanceAsOfDate, today)})`,
            )
            .join(', ')}
          .
        </p>
      )}
    </>
  );
}
