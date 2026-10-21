import { Button, IconButton } from '@/components/ui/Button';
import { cx } from '@/components/ui/cx';
import { signedAmount, type PlanItem } from '@/lib/finance/plan';
import {
  WEEKDAYS_SHORT,
  daysInMonth,
  formatDayMonth,
  formatMonthYear,
  monthStart,
  weekdayIndex,
  type IsoDate,
  type IsoMonth,
} from '@/lib/format/dates';
import { formatAmount, formatMoney } from '@/lib/format/money';

type MonthCalendarProps = {
  month: IsoMonth;
  today: IsoDate;
  selected: IsoDate;
  items: PlanItem[];
  onSelect: (date: IsoDate) => void;
  onMonth: (delta: number) => void;
  onToday: () => void;
};

/** Календарь операций месяца: суммы поступлений и расходов по дням (на телефоне — знаки «+/−»). */
export function MonthCalendar({
  month,
  today,
  selected,
  items,
  onSelect,
  onMonth,
  onToday,
}: MonthCalendarProps) {
  const lead = weekdayIndex(monthStart(month));
  const count = daysInMonth(month);
  const trail = (7 - ((lead + count) % 7)) % 7;

  const totals = new Map<IsoDate, { inc: number; out: number }>();
  for (const i of items) {
    if (i.status === 'skipped') continue;
    const t = totals.get(i.date) ?? { inc: 0, out: 0 };
    const v = signedAmount(i);
    if (v > 0) t.inc += v;
    else t.out += v;
    totals.set(i.date, t);
  }

  return (
    <section className="cal" aria-label="Календарь операций">
      <div className="cal-head">
        <h2 className="h2">{formatMonthYear(month)}</h2>
        <div className="cal-nav">
          <IconButton icon="chevL" label="Предыдущий месяц" onClick={() => onMonth(-1)} />
          <Button variant="ghost" size="sm" onClick={onToday}>
            Сегодня
          </Button>
          <IconButton icon="chevR" label="Следующий месяц" onClick={() => onMonth(1)} />
        </div>
      </div>
      <div className="cal-grid">
        {WEEKDAYS_SHORT.map((n, i) => (
          <div key={n} className={cx('cal-dow', i > 4 && 'we')} aria-hidden="true">
            {n}
          </div>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <div key={`l${i}`} className="day-blank" />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const d = i + 1;
          const date = `${month}-${String(d).padStart(2, '0')}`;
          const t = totals.get(date);
          const isToday = date === today;
          const aria = [
            formatDayMonth(date, today),
            isToday && 'сегодня',
            t?.inc && `поступления ${formatMoney(t.inc)}`,
            t?.out && `расходы ${formatMoney(-t.out)}`,
            !t && 'без операций',
          ]
            .filter(Boolean)
            .join(', ');
          return (
            <button
              type="button"
              key={date}
              className={cx(
                'day',
                date < today && 'is-past',
                isToday && 'is-today',
                date === selected && 'is-sel',
              )}
              onClick={() => onSelect(date)}
              aria-label={aria}
              aria-pressed={date === selected}
            >
              <span className="day-n">{d}</span>
              <span className="day-marks">
                {t && t.inc > 0 && (
                  <span className="mk in">
                    <span className="mk-sign in" aria-hidden="true">
                      +
                    </span>
                    <span className="mk-amt">+{formatAmount(t.inc)}</span>
                  </span>
                )}
                {t && t.out < 0 && (
                  <span className="mk out">
                    <span className="mk-sign out" aria-hidden="true">
                      −
                    </span>
                    <span className="mk-amt">−{formatAmount(t.out)}</span>
                  </span>
                )}
              </span>
            </button>
          );
        })}
        {Array.from({ length: trail }, (_, i) => (
          <div key={`t${i}`} className="day-blank" />
        ))}
      </div>
      <div className="cal-legend">
        <span>
          <span className="mk-sign always in" aria-hidden="true">
            +
          </span>
          поступление
        </span>
        <span>
          <span className="mk-sign always out" aria-hidden="true">
            −
          </span>
          расход
        </span>
        <span>
          <span className="today-dot" aria-hidden="true" />
          сегодня, {formatDayMonth(today, today)}
        </span>
      </div>
    </section>
  );
}
