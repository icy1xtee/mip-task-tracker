import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Segmented } from '@/components/ui/Choice';
import { DateInput, Field, MoneyInput, Select, TextInput } from '@/components/ui/Field';
import { Panel } from '@/components/ui/Panel';
import { useToast } from '@/components/ui/useToast';
import { useConfirmDelete } from '@/components/ui/useConfirmDelete';
import { getErrorMessage } from '@/lib/firebase/errors';
import { todayIsoDate } from '@/lib/format/dates';
import { minorToRublesInput } from '@/lib/format/money';
import { balanceMoney, requiredDate, titleField } from '@/lib/forms';
import type { Account } from '@/types/models';
import {
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_LABELS,
  createAccount,
  deleteAccount,
  updateAccount,
} from './api';

const schema = z.object({
  name: titleField('Добавьте название счёта'),
  type: z.enum(ACCOUNT_TYPES),
  sign: z.enum(['money', 'debt']),
  amount: balanceMoney,
  balanceAsOfDate: requiredDate,
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

type AccountFormProps = { account: Account | null; usage: number; onClose: () => void };

export function AccountForm({ account, usage, onClose }: AccountFormProps) {
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: account?.name ?? '',
      type: account?.type ?? 'debit',
      sign: account && account.openingBalanceMinor < 0 ? 'debt' : 'money',
      amount: account ? minorToRublesInput(Math.abs(account.openingBalanceMinor)) : '',
      balanceAsOfDate: account?.balanceAsOfDate ?? todayIsoDate(),
    },
  });

  const del = useConfirmDelete<Account>({
    title: (a) => `Удалить счёт «${a.name}»?`,
    text: () => 'Счёт пропадёт из итогов и прогноза у вас обоих.',
    remove: (a) => deleteAccount(a.id),
    doneMessage: 'Счёт удалён',
    onDone: onClose,
  });

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    const input = {
      name: v.name,
      type: v.type,
      openingBalanceMinor: v.sign === 'debt' ? -v.amount : v.amount,
      balanceAsOfDate: v.balanceAsOfDate,
    };
    try {
      if (account) await updateAccount(account.id, input);
      else await createAccount(input);
      toast(account ? 'Счёт обновлён' : 'Счёт добавлен');
      onClose();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  });

  const onDelete = () => {
    if (!account) return;
    if (usage > 0) {
      setError(
        `К счёту привязано операций: ${usage}. Сначала удалите их или перенесите на другой счёт.`,
      );
      return;
    }
    del.ask(account);
  };

  return (
    <>
      <Panel
        open={!del.isOpen}
        onClose={onClose}
        title={account ? 'Изменить счёт' : 'Новый счёт'}
        onSubmit={onSubmit}
        submitLabel="Сохранить"
        saving={isSubmitting}
        error={error}
        onDelete={account ? onDelete : undefined}
      >
        <Field label="Название" error={errors.name?.message}>
          {(p) => (
            <TextInput
              {...p}
              placeholder="Например, общая дебетовая карта"
              autoFocus={!account}
              {...register('name')}
            />
          )}
        </Field>
        <Field label="Тип">
          {(p) => (
            <Select
              {...p}
              {...register('type', {
                onChange: (e) =>
                  !account && setValue('sign', e.target.value === 'credit' ? 'debt' : 'money'),
              })}
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ACCOUNT_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div className="field">
          <span className="label" id="acc-sign">
            Остаток
          </span>
          <Controller
            control={control}
            name="sign"
            render={({ field }) => (
              <Segmented<'money' | 'debt'>
                full
                ariaLabelledBy="acc-sign"
                value={field.value}
                onChange={field.onChange}
                options={[
                  { value: 'money', label: 'Деньги на счёте', sign: '+' },
                  { value: 'debt', label: 'Долг', sign: '−' },
                ]}
              />
            )}
          />
        </div>
        <div className="row2">
          <Field label="Сумма" error={errors.amount?.message}>
            {(p) => <MoneyInput {...p} {...register('amount')} />}
          </Field>
          <Field label="На дату" error={errors.balanceAsOfDate?.message}>
            {(p) => <DateInput {...p} {...register('balanceAsOfDate')} />}
          </Field>
        </div>
        <p className="hint">
          Остаток на конец этого дня. Фактические и запланированные операции после этой даты попадут
          в баланс и прогноз, более ранние уже учтены в остатке.
        </p>
      </Panel>
      {del.dialog}
    </>
  );
}
