import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Segmented } from '@/components/ui/Choice';
import { Field, MoneyInput, TextArea, TextInput } from '@/components/ui/Field';
import { Panel } from '@/components/ui/Panel';
import { Tag } from '@/components/ui/Tag';
import { useToast } from '@/components/ui/useToast';
import { useConfirmDelete } from '@/components/ui/useConfirmDelete';
import { getErrorMessage } from '@/lib/firebase/errors';
import { todayIsoDate } from '@/lib/format/dates';
import { minorToRublesInput } from '@/lib/format/money';
import { optionalDate, optionalMoney, optionalText, optionalUrl, titleField } from '@/lib/forms';
import type { Activity } from '@/types/models';
import { createActivity, deleteActivity, updateActivity } from './api';
import {
  applyBookingMode,
  bookingModeOf,
  ideaDeleteCopy,
  statusTag,
  type BookingMode,
} from './ideaView';

const schema = z.object({
  title: titleField(),
  cost: optionalMoney,
  url: optionalUrl,
  description: optionalText(),
  booking: z.enum(['needs', 'booked', 'none']),
  plannedDate: optionalDate,
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

function IdeaStatusTag({ idea }: { idea: Activity }) {
  const tag = statusTag(idea, todayIsoDate());
  return (
    <Tag tone={tag.tone} icon={tag.icon}>
      {tag.label}
    </Tag>
  );
}

export function IdeaForm({ idea, onClose }: { idea: Activity | null; onClose: () => void }) {
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const mode = idea ? bookingModeOf(idea) : 'needs';
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: idea?.title ?? '',
      cost: idea?.estimatedCostMinor != null ? minorToRublesInput(idea.estimatedCostMinor) : '',
      url: idea?.url ?? '',
      description: idea?.description ?? '',
      booking: mode ?? 'needs',
      plannedDate: idea?.plannedDate ?? '',
    },
  });

  const del = useConfirmDelete<Activity>({
    ...ideaDeleteCopy,
    remove: (i) => deleteActivity(i.id),
    doneMessage: 'Идея удалена',
    onDone: onClose,
  });

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    // Сходившие и архивные идеи сохраняют свой статус — бронь меняется только у актуальных.
    const status =
      mode === null && idea
        ? { status: idea.status, needsBooking: idea.needsBooking }
        : applyBookingMode(v.booking);
    const input = {
      title: v.title,
      description: v.description,
      url: v.url,
      estimatedCostMinor: v.cost,
      plannedDate: v.plannedDate,
      ...status,
    };
    try {
      if (idea) await updateActivity(idea.id, input);
      else await createActivity(input);
      toast(idea ? 'Изменения сохранены' : 'Идея добавлена');
      onClose();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  });

  return (
    <>
      <Panel
        open={!del.isOpen}
        onClose={onClose}
        title={idea ? 'Изменить идею' : 'Новая идея'}
        onSubmit={onSubmit}
        submitLabel="Сохранить"
        saving={isSubmitting}
        error={error}
        onDelete={idea ? () => del.ask(idea) : undefined}
      >
        <Field label="Название" error={errors.title?.message}>
          {(p) => (
            <TextInput
              {...p}
              placeholder="Например, сходить на концерт"
              autoFocus={!idea}
              {...register('title')}
            />
          )}
        </Field>
        <div className="row2">
          <Field label="Примерно на двоих" error={errors.cost?.message}>
            {(p) => <MoneyInput {...p} {...register('cost')} />}
          </Field>
          <Field label="Ссылка" optional="если есть" error={errors.url?.message}>
            {(p) => (
              <TextInput
                {...p}
                type="url"
                inputMode="url"
                placeholder="https://"
                {...register('url')}
              />
            )}
          </Field>
        </div>
        <Field label="Коротко о чём" error={errors.description?.message}>
          {(p) => (
            <TextArea
              {...p}
              rows={2}
              placeholder="Одна-две фразы, чтобы вспомнить, почему хотелось"
              {...register('description')}
            />
          )}
        </Field>
        {mode !== null ? (
          <div className="field">
            <span className="label" id="idea-booking">
              Бронирование
            </span>
            <Controller
              control={control}
              name="booking"
              render={({ field }) => (
                <Segmented<BookingMode>
                  full
                  ariaLabelledBy="idea-booking"
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    { value: 'needs', label: 'Нужна бронь' },
                    { value: 'booked', label: 'Забронировано' },
                    { value: 'none', label: 'Не нужна' },
                  ]}
                />
              )}
            />
          </div>
        ) : (
          idea && (
            <div className="field">
              <span className="label">Статус</span>
              <span>
                <IdeaStatusTag idea={idea} />
              </span>
              <p className="hint">Вернуть идею в список можно через меню «…» на карточке.</p>
            </div>
          )
        )}
        <Field label="Дата" optional="если запланировали" error={errors.plannedDate?.message}>
          {(p) => <TextInput {...p} type="date" {...register('plannedDate')} />}
        </Field>
      </Panel>
      {del.dialog}
    </>
  );
}
