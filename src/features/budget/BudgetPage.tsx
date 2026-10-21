import { useMemo, useState } from 'react';
import { NavLink } from 'react-router';
import { usePageChrome } from '@/components/layout/chrome';
import { Button } from '@/components/ui/Button';
import { cx } from '@/components/ui/cx';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataView, EmptyState } from '@/components/ui/States';
import { useConfirmDelete } from '@/components/ui/useConfirmDelete';
import { actualBalances } from '@/lib/finance/forecast';
import { expandPlan, type PlanItem } from '@/lib/finance/plan';
import {
  addMonthsIso,
  formatMonthYear,
  monthEnd,
  monthOf,
  monthStart,
  todayIsoDate,
  type IsoDate,
  type IsoMonth,
} from '@/lib/format/dates';
import type { Account, Transaction } from '@/types/models';
import { AccountForm } from './AccountForm';
import { Accounts } from './Accounts';
import { ActualView } from './ActualView';
import {
  accountUsage,
  deletePlannedEntry,
  deleteRule,
  deleteTransaction,
  useBudgetData,
} from './api';
import { DayPanel } from './DayPanel';
import { MonthCalendar } from './MonthCalendar';
import { PlanForm, type PlanFormTarget } from './PlanForm';
import { transactionDeleteCopy } from './budgetMeta';
import { TransactionForm } from './TransactionForm';
import { usePlanActions } from './usePlanActions';

type Tab = 'plan' | 'actual';
type Forms =
  | { kind: 'account'; account: Account | null }
  | { kind: 'plan'; target: PlanFormTarget }
  | { kind: 'transaction'; transaction: Transaction | null }
  | null;

export function BudgetPage({ tab }: { tab: Tab }) {
  const { state, data } = useBudgetData();
  const today = todayIsoDate();
  const [month, setMonth] = useState<IsoMonth>(monthOf(today));
  const [selected, setSelected] = useState<IsoDate>(today);
  const [form, setForm] = useState<Forms>(null);
  const hasAccounts = data.accounts.length > 0;

  const addLabel = tab === 'plan' ? 'Запланировать операцию' : 'Добавить трату';
  const openAdd = () => {
    if (!hasAccounts) return setForm({ kind: 'account', account: null });
    if (tab === 'plan')
      setForm({
        kind: 'plan',
        target: { mode: 'new', date: selected >= today ? selected : today },
      });
    else setForm({ kind: 'transaction', transaction: null });
  };
  usePageChrome(
    {
      title: 'Бюджет',
      sub: formatMonthYear(month),
      addLabel: hasAccounts ? addLabel : 'Добавить счёт',
    },
    openAdd,
  );

  const delPlan = useConfirmDelete<PlanItem>({
    title: (i) =>
      i.source === 'recurring' ? `Удалить повтор «${i.title}»?` : `Удалить операцию «${i.title}»?`,
    text: (i) =>
      i.source === 'recurring'
        ? 'Пропадут все будущие даты этого повтора у вас обоих. Уже внесённые оплаты останутся в фактических операциях.'
        : 'Операция пропадёт из плана и прогноза. Если она была оплачена, факт оплаты останется.',
    remove: async (i) => {
      if (i.source === 'recurring') {
        const rule = data.rules.find((r) => r.id === i.sourceId);
        if (rule) await deleteRule(rule, data);
      } else {
        const entry = data.plannedEntries.find((e) => e.id === i.sourceId);
        if (entry) await deletePlannedEntry(entry, data);
      }
    },
    doneMessage: 'Удалено из плана',
  });
  const delTx = useConfirmDelete<Transaction>({
    ...transactionDeleteCopy,
    remove: deleteTransaction,
    doneMessage: 'Операция удалена',
  });

  const editPlan = (i: PlanItem) => {
    if (i.source === 'recurring') {
      const rule = data.rules.find((r) => r.id === i.sourceId);
      if (rule) setForm({ kind: 'plan', target: { mode: 'rule', rule } });
    } else {
      const entry = data.plannedEntries.find((e) => e.id === i.sourceId);
      if (entry) setForm({ kind: 'plan', target: { mode: 'entry', entry } });
    }
  };
  const menuFor = usePlanActions(today, { onEdit: editPlan, onDelete: delPlan.ask });

  const monthItems = useMemo(
    () => expandPlan(data, monthStart(month), monthEnd(month)),
    [data, month],
  );
  const dayItems =
    monthOf(selected) === month
      ? monthItems.filter((i) => i.date === selected)
      : expandPlan(data, selected, selected);
  const balances = useMemo(
    () => actualBalances(data.accounts, data.transactions, today),
    [data.accounts, data.transactions, today],
  );

  const changeMonth = (next: IsoMonth) => {
    setMonth(next);
    setSelected(next === monthOf(today) ? today : monthStart(next));
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow={formatMonthYear(month)}
        title="Бюджет"
        actions={
          state.status === 'ready' && (
            <Button icon="plus" onClick={openAdd}>
              {hasAccounts ? addLabel : 'Добавить счёт'}
            </Button>
          )
        }
      />
      <nav className="subtabs" aria-label="Разделы бюджета">
        <NavLink to="/budget" end className={({ isActive }) => cx('subtab', isActive && 'is-on')}>
          План
        </NavLink>
        <NavLink
          to="/budget/actual"
          className={({ isActive }) => cx('subtab', isActive && 'is-on')}
        >
          Фактические расходы
        </NavLink>
      </nav>

      <DataView state={state}>
        {() =>
          !hasAccounts ? (
            <EmptyState
              icon="wallet"
              text="Добавьте счета — общую карту, наличные, кредитку — чтобы видеть общий баланс, план платежей и прогноз."
              action={
                <Button icon="plus" onClick={() => setForm({ kind: 'account', account: null })}>
                  Добавить счёт
                </Button>
              }
            />
          ) : tab === 'plan' ? (
            <>
              <Accounts
                balances={balances}
                today={today}
                onEdit={(account) => setForm({ kind: 'account', account })}
                onAdd={() => setForm({ kind: 'account', account: null })}
              />
              <div className="split">
                <MonthCalendar
                  month={month}
                  today={today}
                  selected={selected}
                  items={monthItems}
                  onSelect={setSelected}
                  onMonth={(d) => changeMonth(addMonthsIso(month, d))}
                  onToday={() => {
                    setMonth(monthOf(today));
                    setSelected(today);
                  }}
                />
                <DayPanel
                  date={selected}
                  today={today}
                  input={data}
                  items={dayItems}
                  menuFor={menuFor}
                  onPlan={() => setForm({ kind: 'plan', target: { mode: 'new', date: selected } })}
                />
              </div>
            </>
          ) : (
            <ActualView
              month={month}
              today={today}
              transactions={data.transactions}
              accounts={data.accounts}
              onMonth={changeMonth}
              onAdd={() => setForm({ kind: 'transaction', transaction: null })}
              onEdit={(transaction) => setForm({ kind: 'transaction', transaction })}
              onDelete={delTx.ask}
            />
          )
        }
      </DataView>

      {form?.kind === 'account' && (
        <AccountForm
          account={form.account}
          usage={form.account ? accountUsage(data, form.account.id) : 0}
          onClose={() => setForm(null)}
        />
      )}
      {form?.kind === 'plan' && (
        <PlanForm target={form.target} accounts={data.accounts} onClose={() => setForm(null)} />
      )}
      {form?.kind === 'transaction' && (
        <TransactionForm
          transaction={form.transaction}
          accounts={data.accounts}
          onClose={() => setForm(null)}
        />
      )}
      {delPlan.dialog}
      {delTx.dialog}
    </div>
  );
}
