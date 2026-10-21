import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { usePageChrome } from '@/components/layout/chrome';
import { Button, ExternalLink } from '@/components/ui/Button';
import { buttonClass } from '@/components/ui/buttonClass';
import { cx } from '@/components/ui/cx';
import { Icon } from '@/components/ui/Icon';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataView } from '@/components/ui/States';
import { Tag } from '@/components/ui/Tag';
import { combine } from '@/lib/firebase/db';
import { actualBalances, sumBalances } from '@/lib/finance/forecast';
import {
  formatDayMonth,
  formatDayMonthShort,
  formatWeekdayDayMonth,
  todayIsoDate,
} from '@/lib/format/dates';
import { formatMoney, formatSignedMoney } from '@/lib/format/money';
import { pl } from '@/lib/format/plural';
import { pickRandom } from '@/lib/random';
import { signedAmount } from '@/lib/finance/plan';
import type { Task } from '@/types/models';
import { accountIcon, planItemMeta } from '@/features/budget/budgetMeta';
import { useBudgetData } from '@/features/budget/api';
import { OpRow } from '@/features/budget/OpRow';
import { useActivities } from '@/features/ideas/api';
import { costLabel, randomPool, statusTag } from '@/features/ideas/ideaView';
import { useTasks } from '@/features/tasks/api';
import { TaskForm } from '@/features/tasks/TaskForm';
import { TaskRow } from '@/features/tasks/TaskRow';
import { isOverdue, sortByDue } from '@/features/tasks/taskView';
import { useTaskToggle } from '@/features/tasks/useTaskToggle';
import { overviewForecast, upcomingPayments } from './overviewView';

export function OverviewPage() {
  const tasks = useTasks();
  const ideas = useActivities();
  const budget = useBudgetData();
  const today = todayIsoDate();
  const [taskForm, setTaskForm] = useState<{ task: Task | null } | null>(null);
  const [ideaId, setIdeaId] = useState<string | null>(null);
  const toggle = useTaskToggle();
  const openNew = () => setTaskForm({ task: null });
  const dayTitle = formatWeekdayDayMonth(today, today);

  usePageChrome({ title: 'Сегодня', sub: dayTitle, addLabel: 'Новое дело' }, openNew);

  const state = combine(tasks, ideas, budget.state);
  const open = useMemo(() => sortByDue(tasks.data).filter((t) => !t.isCompleted), [tasks.data]);
  const overdueN = open.filter((t) => isOverdue(t, today)).length;
  const upcoming = useMemo(() => upcomingPayments(budget.data, today), [budget.data, today]);
  const todayIncome = upcoming.find((i) => i.date === today && i.type === 'income');

  const pool = useMemo(() => randomPool(ideas.data), [ideas.data]);
  const poolKey = pool.map((i) => i.id).join(',');
  // Идея выбирается случайно при первом показе (и при смене состава идей); «Другая идея» — новый честный выбор.
  const initialIdea = useMemo(() => pickRandom(pool), [poolKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const idea = pool.find((i) => i.id === ideaId) ?? initialIdea ?? undefined;

  const lead =
    state.status === 'ready'
      ? [
          open.length
            ? `Осталось ${open.length} ${pl(open.length, 'дело', 'дела', 'дел')}`
            : 'Все дела сделаны',
          overdueN > 0 &&
            `${overdueN} ${pl(overdueN, 'просроченное', 'просроченных', 'просроченных')}`,
          todayIncome &&
            `сегодня ожидается ${todayIncome.title.toLowerCase()} ${formatSignedMoney(signedAmount(todayIncome))}`,
        ]
          .filter(Boolean)
          .join(' · ')
      : undefined;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Сегодня"
        title={dayTitle}
        lead={lead}
        actions={
          <Button icon="plus" onClick={openNew}>
            Новое дело
          </Button>
        }
      />
      <DataView state={state}>
        {() => (
          <div className="split">
            <div className="stack">
              <section className="section">
                <div className="section-head">
                  <h2 className="h2">Ближайшие дела</h2>
                  <Link className="textlink" to="/tasks">
                    Все дела
                    <Icon name="chevR" />
                  </Link>
                </div>
                {open.length ? (
                  <div className="list">
                    {open.slice(0, 4).map((t) => (
                      <TaskRow
                        key={t.id}
                        task={t}
                        today={today}
                        onToggle={toggle}
                        onEdit={(task) => setTaskForm({ task })}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="empty-inline">
                    {tasks.data.length ? 'Все дела сделаны.' : 'Дел пока нет — добавьте первое.'}
                  </div>
                )}
              </section>
              <section className="section">
                <div className="section-head">
                  <h2 className="h2">Предстоящие платежи</h2>
                  <Link className="textlink" to="/budget">
                    План бюджета
                    <Icon name="chevR" />
                  </Link>
                </div>
                {upcoming.length ? (
                  <div className="list">
                    {upcoming.map((i) => (
                      <OpRow
                        key={i.key}
                        item={i}
                        meta={`${i.date === today ? 'Сегодня' : i.date < today ? `${formatDayMonthShort(i.date, today)} · не отмечено` : formatDayMonthShort(i.date, today)} · ${planItemMeta(i, budget.data.accounts)}`}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="empty-inline">В ближайший месяц ничего не запланировано.</div>
                )}
              </section>
            </div>

            <div className="stack">
              <MoneyBlock budget={budget.data} today={today} />
              {idea ? (
                <section className="feature block">
                  <div
                    className="eyebrow"
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Icon name="idea" size="sm" />
                    Идея для совместного вечера
                  </div>
                  <div className="feature-title">{idea.title}</div>
                  {idea.description && <p className="small sub">{idea.description}</p>}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="money">{costLabel(idea).label}</span>
                    {costLabel(idea).perTwo && <span className="small muted">на двоих</span>}
                    <Tag tone={statusTag(idea, today).tone}>{statusTag(idea, today).label}</Tag>
                  </div>
                  <div className="feature-actions">
                    {idea.url && (
                      <ExternalLink className={buttonClass('secondary', 'sm')} href={idea.url}>
                        Открыть
                        <Icon name="ext" />
                      </ExternalLink>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      icon="shuffle"
                      disabled={pool.length < 2}
                      onClick={() =>
                        setIdeaId(pickRandom(pool.filter((i) => i.id !== idea.id))?.id ?? idea.id)
                      }
                    >
                      Другая идея
                    </Button>
                  </div>
                </section>
              ) : (
                <section className="feature block">
                  <div
                    className="eyebrow"
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Icon name="idea" size="sm" />
                    Идея для совместного вечера
                  </div>
                  <p className="small sub">
                    {ideas.data.length
                      ? 'Свободных идей нет: всё уже забронировано или прошло. Добавьте новую.'
                      : 'Идей пока нет. Добавьте пару — и здесь будет случайное предложение на вечер.'}
                  </p>
                  <div className="feature-actions">
                    <Link className={buttonClass('secondary', 'sm')} to="/ideas">
                      Выбрать идею
                    </Link>
                  </div>
                </section>
              )}
            </div>
          </div>
        )}
      </DataView>
      {taskForm && <TaskForm task={taskForm.task} onClose={() => setTaskForm(null)} />}
    </div>
  );
}

function MoneyBlock({
  budget,
  today,
}: {
  budget: ReturnType<typeof useBudgetData>['data'];
  today: string;
}) {
  const balances = actualBalances(budget.accounts, budget.transactions, today);
  const forecast = overviewForecast(budget, today);
  if (!budget.accounts.length) {
    return (
      <section className="block">
        <div className="section-head">
          <h2 className="h2">Деньги</h2>
        </div>
        <p className="small sub">Добавьте счета в бюджете, чтобы видеть общий баланс и прогноз.</p>
        <div>
          <Link className={buttonClass('secondary', 'sm')} to="/budget">
            К бюджету
          </Link>
        </div>
      </section>
    );
  }
  return (
    <section className="block">
      <div className="section-head">
        <h2 className="h2">Деньги</h2>
        <Link className="textlink" to="/budget">
          Счета
          <Icon name="chevR" />
        </Link>
      </div>
      <div>
        <div className="small sub">Итого по счетам, с учётом долга</div>
        <div className="big">{formatMoney(sumBalances(balances).net)}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {balances.map((b) => (
          <div className="kv" key={b.account.id}>
            <span className="kv-name">
              <Icon name={accountIcon(b.account.type)} />
              {b.account.name}
            </span>
            <span className={cx('money', b.balanceMinor < 0 && 'debt')}>
              {formatMoney(b.balanceMinor)}
            </span>
          </div>
        ))}
      </div>
      {forecast && (
        <>
          <div className="divider" />
          <div>
            <div className="small sub">Прогноз на {formatDayMonth(forecast.date, today)}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <span className="stat-val">{formatMoney(forecast.totalMinor)}</span>
              <span className="small muted">
                {forecast.trigger
                  ? `после «${forecast.trigger.title}» ${formatSignedMoney(signedAmount(forecast.trigger))}`
                  : `с учётом ${forecast.count} ${pl(forecast.count, 'операции', 'операций', 'операций')} до конца месяца`}
              </span>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
