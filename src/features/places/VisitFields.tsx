import { useId } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { cx } from '@/components/ui/cx';
import { DateInput, Field, MoneyInput, TextArea } from '@/components/ui/Field';
import { todayIsoDate } from '@/lib/format/dates';
import type { VisitValues } from './placeForms';
import { PARTNERS, SCORE_MAX, SCORE_MIN } from './placeMeta';

const SCORES = Array.from({ length: SCORE_MAX - SCORE_MIN + 1 }, (_, i) => SCORE_MIN + i);

/** Оценка 1–10 в одно касание; повторное нажатие на выбранную снимает оценку. */
export function ScorePicker({
  value,
  onChange,
  labelledBy,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  labelledBy: string;
}) {
  return (
    <div className="score-pick" role="group" aria-labelledby={labelledBy}>
      {SCORES.map((n) => (
        <button
          key={n}
          type="button"
          className={cx(
            'score-btn',
            value === n && 'is-on',
            value !== null && n < value && 'is-fill',
          )}
          aria-pressed={value === n}
          aria-label={`${n} из ${SCORE_MAX}`}
          onClick={() => onChange(value === n ? null : n)}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function ScoreRow({ name, label }: { name: keyof VisitValues; label: string }) {
  const id = useId();
  const { control } = useFormContext<VisitValues>();
  return (
    <div className="score-row">
      <span className="label" id={id}>
        {label}
      </span>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <ScorePicker
            labelledBy={id}
            value={typeof field.value === 'number' ? field.value : null}
            onChange={field.onChange}
          />
        )}
      />
    </div>
  );
}

/** Дата, сумма, оценки каждого партнёра и комментарий. Работает внутри FormProvider. */
export function VisitFields() {
  const {
    register,
    formState: { errors },
  } = useFormContext<VisitValues>();
  return (
    <>
      <div className="row2">
        <Field label="Дата посещения" error={errors.date?.message}>
          {(p) => <DateInput {...p} max={todayIsoDate()} {...register('date')} />}
        </Field>
        <Field label="Потратили" optional="если помните" error={errors.spent?.message}>
          {(p) => <MoneyInput {...p} {...register('spent')} />}
        </Field>
      </div>
      {PARTNERS.map((p) => (
        <fieldset className="score-block" key={p.key}>
          <legend className="score-who">{p.name}</legend>
          <ScoreRow name={p.rating} label="Впечатление" />
          <ScoreRow name={p.returnScore} label="Хочется вернуться" />
        </fieldset>
      ))}
      <Field label="Комментарий" optional="если хочется" error={errors.visitNote?.message}>
        {(p) => (
          <TextArea
            {...p}
            rows={2}
            placeholder="Что запомнилось: блюдо, звук, вид из окна"
            {...register('visitNote')}
          />
        )}
      </Field>
    </>
  );
}
