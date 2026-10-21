import { useMemo } from 'react';
import {
  deleteDoc,
  runTransaction,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';
import {
  combine,
  created,
  db,
  docRef,
  newDocRef,
  touched,
  useCollection,
  write,
  WriteError,
} from '@/lib/firebase/db';
import {
  InvalidDocument,
  audit,
  int,
  intOrNull,
  isoDate,
  isoDateOrNull,
  oneOf,
  safeParser,
  str,
  strOrNull,
} from '@/lib/firebase/parse';
import type { IsoDate } from '@/lib/format/dates';
import type { PlanItem } from '@/lib/finance/plan';
import type {
  Account,
  AccountType,
  EntryType,
  Frequency,
  PlannedEntry,
  RecurringOccurrence,
  RecurringRule,
  Transaction,
} from '@/types/models';

export const ACCOUNT_TYPES = ['debit', 'credit', 'cash', 'savings', 'other'] as const;
const ENTRY_TYPES = ['income', 'expense'] as const;
const PLAN_STATUSES = ['planned', 'completed', 'skipped'] as const;
const FREQUENCIES = ['weekly', 'monthly', 'yearly'] as const;

const positive = (d: DocumentData, key: string) => {
  const v = int(d, key);
  if (v <= 0) throw new InvalidDocument(key);
  return v;
};

const parseAccount = safeParser('accounts', (id, d): Account => ({
  ...audit(id, d),
  name: str(d, 'name'),
  type: oneOf(d, 'type', ACCOUNT_TYPES),
  openingBalanceMinor: int(d, 'openingBalanceMinor'),
  balanceAsOfDate: isoDate(d, 'balanceAsOfDate'),
}));

const entryFields = (d: DocumentData) => ({
  title: str(d, 'title'),
  type: oneOf(d, 'type', ENTRY_TYPES),
  amountMinor: positive(d, 'amountMinor'),
  accountId: str(d, 'accountId'),
  category: str(d, 'category'),
  note: strOrNull(d, 'note'),
});

const parsePlanned = safeParser('plannedEntries', (id, d): PlannedEntry => ({
  ...audit(id, d),
  ...entryFields(d),
  date: isoDate(d, 'date'),
  status: oneOf(d, 'status', PLAN_STATUSES),
}));

const parseRule = safeParser('recurringRules', (id, d): RecurringRule => ({
  ...audit(id, d),
  ...entryFields(d),
  frequency: oneOf(d, 'frequency', FREQUENCIES),
  startDate: isoDate(d, 'startDate'),
  endDate: isoDateOrNull(d, 'endDate'),
  dayOfMonth: intOrNull(d, 'dayOfMonth'),
}));

const parseOccurrence = safeParser('recurringOccurrences', (id, d): RecurringOccurrence => ({
  ...audit(id, d),
  ruleId: str(d, 'ruleId'),
  date: isoDate(d, 'date'),
  status: oneOf(d, 'status', PLAN_STATUSES),
  actualTransactionId: strOrNull(d, 'actualTransactionId'),
}));

const parseTransaction = safeParser('transactions', (id, d): Transaction => ({
  ...audit(id, d),
  type: oneOf(d, 'type', ENTRY_TYPES),
  amountMinor: positive(d, 'amountMinor'),
  date: isoDate(d, 'date'),
  accountId: str(d, 'accountId'),
  category: str(d, 'category'),
  note: strOrNull(d, 'note'),
  plannedEntryId: strOrNull(d, 'plannedEntryId'),
  recurringOccurrenceId: strOrNull(d, 'recurringOccurrenceId'),
}));

/** Все данные бюджета разом — для плана, прогноза, аналитики и обзора. */
export function useBudgetData() {
  const accounts = useCollection('accounts', parseAccount);
  const plannedEntries = useCollection('plannedEntries', parsePlanned);
  const rules = useCollection('recurringRules', parseRule);
  const occurrences = useCollection('recurringOccurrences', parseOccurrence);
  const transactions = useCollection('transactions', parseTransaction);
  const orderedAccounts = useMemo(
    () =>
      accounts.data
        .slice()
        .sort(
          (a, b) =>
            (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0) ||
            a.name.localeCompare(b.name, 'ru'),
        ),
    [accounts.data],
  );
  // Стабильная ссылка на data: расчёты плана и прогноза мемоизируются по ней.
  const data = useMemo(
    () => ({
      accounts: orderedAccounts,
      plannedEntries: plannedEntries.data,
      rules: rules.data,
      occurrences: occurrences.data,
      transactions: transactions.data,
    }),
    [orderedAccounts, plannedEntries.data, rules.data, occurrences.data, transactions.data],
  );
  return { state: combine(accounts, plannedEntries, rules, occurrences, transactions), data };
}

export type BudgetData = ReturnType<typeof useBudgetData>['data'];

// ---- Счета ----

export type AccountInput = Pick<
  Account,
  'name' | 'type' | 'openingBalanceMinor' | 'balanceAsOfDate'
>;

export function createAccount(input: AccountInput) {
  return write(() => setDoc(newDocRef('accounts'), { ...input, ...created() }));
}

export function updateAccount(id: string, input: AccountInput) {
  return write(() => updateDoc(docRef('accounts', id), { ...input, ...touched() }));
}

export function deleteAccount(id: string) {
  return write(() => deleteDoc(docRef('accounts', id)));
}

export function accountUsage(data: BudgetData, accountId: string): number {
  return (
    data.transactions.filter((t) => t.accountId === accountId).length +
    data.plannedEntries.filter((e) => e.accountId === accountId).length +
    data.rules.filter((r) => r.accountId === accountId).length
  );
}

// ---- План: разовые операции и регулярные правила ----

export type EntryInput = {
  title: string;
  type: EntryType;
  amountMinor: number;
  accountId: string;
  category: string;
  note: string | null;
};

export function createPlannedEntry(input: EntryInput & { date: IsoDate }) {
  return write(() =>
    setDoc(newDocRef('plannedEntries'), { ...input, status: 'planned', ...created() }),
  );
}

export function updatePlannedEntry(id: string, input: EntryInput & { date: IsoDate }) {
  return write(() => updateDoc(docRef('plannedEntries', id), { ...input, ...touched() }));
}

export type RuleInput = EntryInput & {
  frequency: Frequency;
  startDate: IsoDate;
  endDate: IsoDate | null;
};

function ruleFields(input: RuleInput) {
  return {
    ...input,
    dayOfMonth: input.frequency === 'monthly' ? Number(input.startDate.slice(8, 10)) : null,
  };
}

export function createRule(input: RuleInput) {
  return write(() => setDoc(newDocRef('recurringRules'), { ...ruleFields(input), ...created() }));
}

export function updateRule(id: string, input: RuleInput) {
  return write(() =>
    updateDoc(docRef('recurringRules', id), { ...ruleFields(input), ...touched() }),
  );
}

/** Удаляет разовую операцию; факт оплаты остаётся, но больше не ссылается на план. */
export function deletePlannedEntry(entry: PlannedEntry, data: BudgetData) {
  return write(() => {
    const batch = writeBatch(db());
    batch.delete(docRef('plannedEntries', entry.id));
    for (const t of data.transactions.filter((t) => t.plannedEntryId === entry.id)) {
      batch.update(docRef('transactions', t.id), { plannedEntryId: null, ...touched() });
    }
    return batch.commit();
  });
}

/** Удаляет правило и его отметки; фактические оплаты остаются. */
export function deleteRule(rule: RecurringRule, data: BudgetData) {
  return write(() => {
    const batch = writeBatch(db());
    batch.delete(docRef('recurringRules', rule.id));
    const occurrences = data.occurrences.filter((o) => o.ruleId === rule.id);
    const ids = new Set(occurrences.map((o) => o.id));
    for (const o of occurrences) batch.delete(docRef('recurringOccurrences', o.id));
    for (const t of data.transactions.filter(
      (t) => t.recurringOccurrenceId && ids.has(t.recurringOccurrenceId),
    )) {
      batch.update(docRef('transactions', t.id), { recurringOccurrenceId: null, ...touched() });
    }
    return batch.commit();
  });
}

// ---- Отметки плана: оплачено / пропущено / вернуть ----

/**
 * Отмечает элемент плана выполненным и в той же транзакции создаёт фактическую операцию.
 * Если элемент уже отмечен (например, со второго телефона) — ничего не создаёт.
 * Дата факта — дата плана, а если платим заранее — сегодня.
 */
export function completePlanItem(item: PlanItem, today: IsoDate) {
  return write(() =>
    runTransaction(db(), async (tr) => {
      const txRef = newDocRef('transactions');
      const factDate = item.date <= today ? item.date : today;
      const fact = {
        type: item.type,
        amountMinor: item.amountMinor,
        date: factDate,
        accountId: item.accountId,
        category: item.category,
        note: item.title,
        plannedEntryId: item.source === 'planned' ? item.sourceId : null,
        recurringOccurrenceId: item.occurrenceId,
        ...created(),
      };

      if (item.source === 'planned') {
        const ref = docRef('plannedEntries', item.sourceId);
        const snap = await tr.get(ref);
        if (!snap.exists())
          throw new WriteError('conflict', 'Операция уже удалена на другом устройстве.');
        if (snap.data().status !== 'planned') throw new WriteError('conflict');
        tr.update(ref, { status: 'completed', ...touched() });
      } else {
        const ref = docRef('recurringOccurrences', item.occurrenceId!);
        const snap = await tr.get(ref);
        if (snap.exists() && snap.data().status !== 'planned') throw new WriteError('conflict');
        tr.set(ref, {
          ruleId: item.sourceId,
          date: item.date,
          status: 'completed',
          actualTransactionId: txRef.id,
          ...(snap.exists() ? { createdAt: snap.data().createdAt, ...touched() } : created()),
        });
      }
      tr.set(txRef, fact);
    }),
  );
}

export function skipPlanItem(item: PlanItem) {
  return write(() =>
    runTransaction(db(), async (tr) => {
      if (item.source === 'planned') {
        const ref = docRef('plannedEntries', item.sourceId);
        const snap = await tr.get(ref);
        if (!snap.exists() || snap.data().status !== 'planned') throw new WriteError('conflict');
        tr.update(ref, { status: 'skipped', ...touched() });
        return;
      }
      const ref = docRef('recurringOccurrences', item.occurrenceId!);
      const snap = await tr.get(ref);
      if (snap.exists() && snap.data().status !== 'planned') throw new WriteError('conflict');
      tr.set(ref, {
        ruleId: item.sourceId,
        date: item.date,
        status: 'skipped',
        actualTransactionId: null,
        ...(snap.exists() ? { createdAt: snap.data().createdAt, ...touched() } : created()),
      });
    }),
  );
}

/** Возвращает элемент в план: убирает отметку и, если была оплата, связанную фактическую операцию. */
export function reopenPlanItem(item: PlanItem) {
  return write(() => {
    const batch = writeBatch(db());
    if (item.transactionId) batch.delete(docRef('transactions', item.transactionId));
    if (item.source === 'planned')
      batch.update(docRef('plannedEntries', item.sourceId), { status: 'planned', ...touched() });
    else batch.delete(docRef('recurringOccurrences', item.occurrenceId!));
    return batch.commit();
  });
}

// ---- Фактические операции ----

export type TransactionInput = {
  type: EntryType;
  amountMinor: number;
  date: IsoDate;
  accountId: string;
  category: string;
  note: string | null;
};

export function createTransaction(input: TransactionInput) {
  return write(() =>
    setDoc(newDocRef('transactions'), {
      ...input,
      plannedEntryId: null,
      recurringOccurrenceId: null,
      ...created(),
    }),
  );
}

export function updateTransaction(id: string, input: TransactionInput) {
  return write(() => updateDoc(docRef('transactions', id), { ...input, ...touched() }));
}

/** Удаляет факт; если он закрывал плановую операцию — она снова становится запланированной. */
export function deleteTransaction(t: Transaction) {
  return write(() => {
    const batch = writeBatch(db());
    batch.delete(docRef('transactions', t.id));
    if (t.plannedEntryId)
      batch.update(docRef('plannedEntries', t.plannedEntryId), { status: 'planned', ...touched() });
    if (t.recurringOccurrenceId)
      batch.delete(docRef('recurringOccurrences', t.recurringOccurrenceId));
    return batch.commit();
  });
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  debit: 'Дебетовая карта',
  credit: 'Кредитная карта',
  cash: 'Наличные',
  savings: 'Накопительный счёт',
  other: 'Другое',
};
