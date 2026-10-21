import type { IsoDate } from '@/lib/format/dates';

/**
 * Доменные модели — один-к-одному с документами Firestore (раздел 8 ТЗ).
 * Деньги — целые копейки (*Minor), календарные даты — IsoDate (YYYY-MM-DD).
 * Необязательные поля хранятся как null, audit-поля — Firestore Timestamp (здесь — Date).
 */

type Audit = { id: string; createdAt: Date | null; updatedAt: Date | null };

export type Assignee = 'me' | 'partner' | 'both';

export type Task = Audit & {
  title: string;
  description: string | null;
  dueDate: IsoDate | null;
  estimatedCostMinor: number | null;
  assignee: Assignee | null;
  isCompleted: boolean;
  /** Пользовательские разделы («Медицина», «Дом»); одно дело может быть в нескольких. */
  tags: string[];
};

export type ActivityStatus = 'wishlist' | 'booked' | 'completed' | 'archived';

export type Activity = Audit & {
  title: string;
  description: string | null;
  url: string | null;
  /** Сумма на двоих; 0 — бесплатно, null — не указано. */
  estimatedCostMinor: number | null;
  status: ActivityStatus;
  /** Для wishlist: нужна ли бронь (макет: «Нужна бронь» / «Не нужна»). */
  needsBooking: boolean;
  plannedDate: IsoDate | null;
};

export type AccountType = 'debit' | 'credit' | 'cash' | 'savings' | 'other';

export type Account = Audit & {
  name: string;
  type: AccountType;
  /** Знаковый баланс на дату фиксации: > 0 — деньги, < 0 — долг. */
  openingBalanceMinor: number;
  balanceAsOfDate: IsoDate;
};

export type EntryType = 'income' | 'expense';
export type PlanStatus = 'planned' | 'completed' | 'skipped';

export type PlannedEntry = Audit & {
  title: string;
  type: EntryType;
  /** Всегда положительная сумма; знак задаёт type. */
  amountMinor: number;
  date: IsoDate;
  accountId: string;
  category: string;
  note: string | null;
  status: PlanStatus;
};

export type Frequency = 'weekly' | 'monthly' | 'yearly';

export type RecurringRule = Audit & {
  title: string;
  type: EntryType;
  amountMinor: number;
  accountId: string;
  category: string;
  note: string | null;
  frequency: Frequency;
  startDate: IsoDate;
  endDate: IsoDate | null;
  /** Желаемый день месяца для monthly; если в месяце его нет — последний день. */
  dayOfMonth: number | null;
};

export type RecurringOccurrence = Audit & {
  ruleId: string;
  date: IsoDate;
  status: PlanStatus;
  actualTransactionId: string | null;
};

export type Transaction = Audit & {
  type: EntryType;
  amountMinor: number;
  date: IsoDate;
  accountId: string;
  category: string;
  note: string | null;
  plannedEntryId: string | null;
  recurringOccurrenceId: string | null;
};

export type LinkType = 'workspace' | 'document' | 'spreadsheet' | 'folder' | 'other';

export type LinkItem = Audit & {
  title: string;
  url: string;
  description: string | null;
  type: LinkType;
  tags: string[];
};
