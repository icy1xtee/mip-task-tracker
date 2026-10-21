import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Segmented } from '@/components/ui/Choice';
import { DateInput, Field, MoneyInput, Select, TextInput } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Panel } from '@/components/ui/Panel';
import { useToast } from '@/components/ui/useToast';
import { getErrorMessage } from '@/lib/firebase/errors';
import { EXPENSE_CATEGORIES, INCOME_CATEGORY, categoryLabel } from '@/lib/finance/categories';
import { formatDayMonth, todayIsoDate, type IsoDate } from '@/lib/format/dates';
import { minorToRublesInput } from '@/lib/format/money';
import { optionalDate, optionalText, requiredDate, requiredMoney } from '@/lib/forms';
import type { Account, Frequency, PlannedEntry, RecurringRule } from '@/types/models';
import { createPlannedEntry, createRule, updatePlannedEntry, updateRule } from './api';

const schema = z
  .object({
    kind: z.enum(['expense', 'income']),
    amount: requiredMoney,
    title: z.string().trim().max(200, 'Слишком длинно — до 200 символов'),
    date: requiredDate,
    accountId: z.string().min(1, 'Выберите счёт'),
    category: z.string(),
    note: optionalText(500),
    repeat: z.boolean(),
    frequency: z.enum(['weekly', 'monthly', 'yearly']),
    endDate: optionalDate,
  })
  .refine((v) => !v.repeat || !v.endDate || v.endDate >= v.date, {
    path: ['endDate'],
    message: 'Дата окончания раньше даты начала',
  });

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

export type PlanFormTarget =
  | { mode: 'new'; date: IsoDate }
  | { mode: 'entry'; entry: PlannedEntry }
  | { mode: 'rule'; rule: RecurringRule };

type PlanFormProps = { target: PlanFormTarget; accounts: Account[]; onClose: () => void };

/** «Запланировать операцию»: разовая или повторяющаяся (неделя / месяц / год). */
export function PlanForm({ target, accounts, onClose }: PlanFormProps) {
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const source =
    target.mode === 'entry' ? target.entry : target.mode === 'rule' ? target.rule : null;
  const [showNote, setShowNote] = useState(Boolean(source?.note));

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      kind: source?.type ?? 'expense',
      amount: source ? minorToRublesInput(source.amountMinor) : '',
      title: source?.title ?? '',
      date:
        target.mode === 'new'
          ? target.date
          : target.mode === 'entry'
            ? target.entry.date
            : target.rule.startDate,
      accountId: source?.accountId ?? accounts[0]?.id ?? '',
      category: source && source.category !== INCOME_CATEGORY.id ? source.category : 'housing',
      note: source?.note ?? '',
      repeat: target.mode === 'rule',
      frequency: target.mode === 'rule' ? target.rule.frequency : 'monthly',
      endDate: target.mode === 'rule' ? (target.rule.endDate ?? '') : '',
    },
  });
  const kind = useWatch({ control, name: 'kind' });
  const repeat = useWatch({ control, name: 'repeat' });

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    const category = v.kind === 'income' ? INCOME_CATEGORY.id : v.category;
    const entry = {
      title: v.title || (v.kind === 'income' ? 'Поступление' : categoryLabel(category)),
      type: v.kind,
      amountMinor: v.amount,
      accountId: v.accountId,
      category,
      note: v.note,
    };
    try {
      if (target.mode === 'entry')
        await updatePlannedEntry(target.entry.id, { ...entry, date: v.date });
      else if (target.mode === 'rule')
        await updateRule(target.rule.id, {
          ...entry,
          frequency: v.frequency,
          startDate: v.date,
          endDate: v.endDate,
        });
      else if (v.repeat)
        await createRule({
          ...entry,
          frequency: v.frequency,
          startDate: v.date,
          endDate: v.endDate,
        });
      else await createPlannedEntry({ ...entry, date: v.date });
      toast(
        target.mode === 'new'
          ? `Операция запланирована на ${formatDayMonth(v.date, todayIsoDate())}`
          : 'Изменения сохранены',
      );
      onClose();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  });

  const title =
    target.mode === 'new'
      ? 'Запланировать операцию'
      : target.mode === 'rule'
        ? 'Изменить повтор'
        : 'Изменить операцию';

  return (
    <Panel
      open
      onClose={onClose}
      title={title}
      onSubmit={onSubmit}
      submitLabel={target.mode === 'new' ? 'Запланировать' : 'Сохранить'}
      saving={isSubmitting}
      error={error}
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
        {(p) => (
          <MoneyInput large {...p} autoFocus={target.mode === 'new'} {...register('amount')} />
        )}
      </Field>
      <Field label="Назначение" error={errors.title?.message}>
        {(p) => (
          <TextInput {...p} placeholder="Например, зарплата или аренда" {...register('title')} />
        )}
      </Field>
      <div className="row2">
        <Field label={repeat ? 'Начиная с' : 'Дата'} error={errors.date?.message}>
          {(p) => <DateInput {...p} {...register('date')} />}
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
      {kind === 'expense' && (
        <Field label="Категория">
          {(p) => (
            <Select {...p} {...register('category')}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}
      {target.mode === 'new' && (
        <label className="inline-check">
          <input type="checkbox" {...register('repeat')} />
          Повторять
        </label>
      )}
      {repeat && (
        <>
          <div className="field">
            <span className="label" id="plan-freq">
              Как часто
            </span>
            <Controller
              control={control}
              name="frequency"
              render={({ field }) => (
                <Segmented<Frequency>
                  full
                  ariaLabelledBy="plan-freq"
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    { value: 'weekly', label: 'Каждую неделю' },
                    { value: 'monthly', label: 'Каждый месяц' },
                    { value: 'yearly', label: 'Каждый год' },
                  ]}
                />
              )}
            />
          </div>
          <Field label="До" optional="если нужно" error={errors.endDate?.message}>
            {(p) => <DateInput {...p} {...register('endDate')} />}
          </Field>
        </>
      )}
      {showNote ? (
        <Field label="Заметка" error={errors.note?.message}>
          {(p) => <TextInput {...p} placeholder="Например, номер договора" {...register('note')} />}
        </Field>
      ) : (
        <button type="button" className="textlink" onClick={() => setShowNote(true)}>
          <Icon name="plus" />
          Добавить заметку
        </button>
      )}
      <p className="hint">
        {target.mode === 'rule'
          ? 'Изменения применятся ко всем датам повтора. Уже отмеченные оплаты останутся как есть.'
          : repeat
            ? 'Если в месяце нет такого числа, платёж встанет на последний день месяца. Операции появятся в календаре и попадут в прогноз.'
            : 'Операция появится в календаре и попадёт в прогноз баланса на эту и следующие даты.'}
      </p>
    </Panel>
  );
}
