import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Chips, Segmented } from '@/components/ui/Choice';
import { Field, MoneyInput, Select, TextInput } from '@/components/ui/Field';
import { Panel } from '@/components/ui/Panel';
import { useToast } from '@/components/ui/useToast';
import { useConfirmDelete } from '@/components/ui/useConfirmDelete';
import { getErrorMessage } from '@/lib/firebase/errors';
import { EXPENSE_CATEGORIES, INCOME_CATEGORY } from '@/lib/finance/categories';
import { todayIsoDate } from '@/lib/format/dates';
import { minorToRublesInput } from '@/lib/format/money';
import { optionalText, requiredDate, requiredMoney } from '@/lib/forms';
import type { Account, Transaction } from '@/types/models';
import { createTransaction, deleteTransaction, updateTransaction } from './api';
import { transactionDeleteCopy } from './budgetMeta';

const schema = z.object({
  kind: z.enum(['expense', 'income']),
  amount: requiredMoney,
  category: z.string(),
  date: requiredDate,
  note: optionalText(200),
  accountId: z.string().min(1, 'Выберите счёт'),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

type TransactionFormProps = {
  transaction: Transaction | null;
  accounts: Account[];
  onClose: () => void;
};

/** «Новая трата» / доход / изменить фактическую операцию. */
export function TransactionForm({ transaction, accounts, onClose }: TransactionFormProps) {
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      kind: transaction?.type ?? 'expense',
      amount: transaction ? minorToRublesInput(transaction.amountMinor) : '',
      category:
        transaction && transaction.category !== INCOME_CATEGORY.id
          ? transaction.category
          : 'groceries',
      date: transaction?.date ?? todayIsoDate(),
      note: transaction?.note ?? '',
      accountId: transaction?.accountId ?? accounts[0]?.id ?? '',
    },
  });
  const kind = useWatch({ control, name: 'kind' });

  const del = useConfirmDelete<Transaction>({
    ...transactionDeleteCopy,
    remove: deleteTransaction,
    doneMessage: 'Операция удалена',
    onDone: onClose,
  });

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    const input = {
      type: v.kind,
      amountMinor: v.amount,
      date: v.date,
      accountId: v.accountId,
      category: v.kind === 'income' ? INCOME_CATEGORY.id : v.category,
      note: v.note,
    };
    try {
      if (transaction) await updateTransaction(transaction.id, input);
      else await createTransaction(input);
      toast(
        transaction
          ? 'Изменения сохранены'
          : v.kind === 'income'
            ? 'Поступление добавлено'
            : 'Трата добавлена',
      );
      onClose();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  });

  const title = transaction
    ? 'Изменить операцию'
    : kind === 'income'
      ? 'Новое поступление'
      : 'Новая трата';

  return (
    <>
      <Panel
        open={!del.isOpen}
        onClose={onClose}
        title={title}
        onSubmit={onSubmit}
        submitLabel={transaction ? 'Сохранить' : 'Добавить'}
        saving={isSubmitting}
        error={error}
        onDelete={transaction ? () => del.ask(transaction) : undefined}
      >
        <Controller
          control={control}
          name="kind"
          render={({ field }) => (
            <Segmented<'expense' | 'income'>
              full
              ariaLabel="Тип операции"
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: 'expense', label: 'Расход', sign: '−' },
                { value: 'income', label: 'Доход', sign: '+' },
              ]}
            />
          )}
        />
        <Field label="Сумма" error={errors.amount?.message}>
          {(p) => <MoneyInput large {...p} autoFocus={!transaction} {...register('amount')} />}
        </Field>
        {kind === 'expense' && (
          <div className="field">
            <span className="label" id="tx-cat">
              Категория
            </span>
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Chips
                  wrap
                  ariaLabelledBy="tx-cat"
                  value={field.value}
                  onChange={field.onChange}
                  options={EXPENSE_CATEGORIES.map((c) => ({ value: c.id, label: c.label }))}
                />
              )}
            />
          </div>
        )}
        <div className="row2">
          <Field label="Дата" error={errors.date?.message}>
            {(p) => <TextInput {...p} type="date" {...register('date')} />}
          </Field>
          <Field label="Счёт" error={errors.accountId?.message}>
            {(p) => (
              <Select {...p} {...register('accountId')}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <Field label="Комментарий" optional="если нужно" error={errors.note?.message}>
          {(p) => <TextInput {...p} placeholder="Например, кафе у дома" {...register('note')} />}
        </Field>
        {(transaction?.plannedEntryId || transaction?.recurringOccurrenceId) && (
          <p className="hint">
            Операция создана из плана: при удалении платёж в плане снова станет неоплаченным.
          </p>
        )}
      </Panel>
      {del.dialog}
    </>
  );
}
