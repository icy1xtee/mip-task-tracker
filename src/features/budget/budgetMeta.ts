import type { IconName } from '@/components/ui/Icon';
import { categoryLabel } from '@/lib/finance/categories';
import type { PlanItem } from '@/lib/finance/plan';
import type { Account, AccountType, Frequency, Transaction } from '@/types/models';

const ICONS: Record<AccountType, IconName> = {
  debit: 'card',
  credit: 'card',
  cash: 'cash',
  savings: 'piggy',
  other: 'wallet',
};

export function accountIcon(type: AccountType): IconName {
  return ICONS[type];
}

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  weekly: 'еженедельно',
  monthly: 'ежемесячно',
  yearly: 'ежегодно',
};

export function planItemMeta(item: PlanItem, accounts: Account[]): string {
  const account = accounts.find((a) => a.id === item.accountId)?.name ?? 'Счёт удалён';
  return [
    account,
    item.frequency && FREQUENCY_LABELS[item.frequency],
    item.type === 'expense' && categoryLabel(item.category),
  ]
    .filter(Boolean)
    .join(' · ');
}

export const transactionDeleteCopy = {
  title: (t: Transaction) =>
    `Удалить ${t.type === 'income' ? 'поступление' : 'трату'}${t.note ? ` «${t.note}»` : ''}?`,
  text: (t: Transaction) =>
    t.plannedEntryId || t.recurringOccurrenceId
      ? 'Операция пропадёт из фактических, а связанный платёж в плане снова станет неоплаченным.'
      : 'Операция пропадёт из фактических расходов и из расчёта баланса.',
};
