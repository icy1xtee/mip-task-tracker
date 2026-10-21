import type { IsoDate } from '@/lib/format/dates';
import type {
  EntryType,
  Frequency,
  PlannedEntry,
  PlanStatus,
  RecurringOccurrence,
  RecurringRule,
  Transaction,
} from '@/types/models';
import { occurrenceDates, occurrenceId } from './recurrence';

/** Элемент плана на конкретную дату: разовая операция или экземпляр регулярного правила. */
export type PlanItem = {
  key: string;
  source: 'planned' | 'recurring';
  /** id PlannedEntry или RecurringRule. */
  sourceId: string;
  /** Детерминированный id документа recurringOccurrences (только для recurring). */
  occurrenceId: string | null;
  frequency: Frequency | null;
  date: IsoDate;
  title: string;
  type: EntryType;
  amountMinor: number;
  accountId: string;
  category: string;
  note: string | null;
  status: PlanStatus;
  transactionId: string | null;
};

export type PlanData = {
  plannedEntries: PlannedEntry[];
  rules: RecurringRule[];
  occurrences: RecurringOccurrence[];
  transactions: Transaction[];
};

export function signedAmount(item: { type: EntryType; amountMinor: number }): number {
  return item.type === 'income' ? item.amountMinor : -item.amountMinor;
}

/** Все элементы плана в [from, to], отсортированные по дате. */
export function expandPlan(data: PlanData, from: IsoDate, to: IsoDate): PlanItem[] {
  const txByEntry = new Map<string, string>();
  for (const t of data.transactions) {
    if (t.plannedEntryId) txByEntry.set(t.plannedEntryId, t.id);
  }
  const occByKey = new Map<string, RecurringOccurrence>();
  for (const o of data.occurrences) occByKey.set(occurrenceId(o.ruleId, o.date), o);

  const items: PlanItem[] = [];

  for (const e of data.plannedEntries) {
    if (e.date < from || e.date > to) continue;
    items.push({
      key: `p:${e.id}`,
      source: 'planned',
      sourceId: e.id,
      occurrenceId: null,
      frequency: null,
      date: e.date,
      title: e.title,
      type: e.type,
      amountMinor: e.amountMinor,
      accountId: e.accountId,
      category: e.category,
      note: e.note,
      status: e.status,
      transactionId: txByEntry.get(e.id) ?? null,
    });
  }

  for (const r of data.rules) {
    for (const date of occurrenceDates(r, from, to)) {
      const id = occurrenceId(r.id, date);
      const occ = occByKey.get(id);
      items.push({
        key: `r:${id}`,
        source: 'recurring',
        sourceId: r.id,
        occurrenceId: id,
        frequency: r.frequency,
        date,
        title: r.title,
        type: r.type,
        amountMinor: r.amountMinor,
        accountId: r.accountId,
        category: r.category,
        note: r.note,
        status: occ?.status ?? 'planned',
        transactionId: occ?.actualTransactionId ?? null,
      });
    }
  }

  return items.sort((a, b) =>
    a.date === b.date ? a.title.localeCompare(b.title, 'ru') : a.date < b.date ? -1 : 1,
  );
}
