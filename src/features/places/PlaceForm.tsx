import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, FormProvider, useForm, useWatch, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { Segmented } from '@/components/ui/Choice';
import { Field, Select, TextArea, TextInput } from '@/components/ui/Field';
import { Panel } from '@/components/ui/Panel';
import { useConfirmDelete } from '@/components/ui/useConfirmDelete';
import { useToast } from '@/components/ui/useToast';
import { getErrorMessage } from '@/lib/firebase/errors';
import { todayIsoDate } from '@/lib/format/dates';
import { optionalText, titleField } from '@/lib/forms';
import type { PlaceStatus } from '@/types/models';
import { createPlace, deletePlace, updatePlace } from './api';
import {
  formatCoords,
  toVisitInput,
  visitDefaults,
  visitFields,
  type PlaceDraft,
} from './placeForms';
import { PLACE_CATEGORIES, PLACE_CATEGORY_VALUES, PLACE_STATUSES, STATUS_LABEL } from './placeMeta';
import { placeDeleteCopy, type PlaceItem } from './placesView';
import { VisitFields } from './VisitFields';

const placeFields = {
  name: titleField('Добавьте название места'),
  address: optionalText(300),
  category: z.enum(PLACE_CATEGORY_VALUES),
  status: z.enum(PLACE_STATUSES),
  note: optionalText(2000),
};
const placeSchema = z.object(placeFields);
const fullSchema = z.object({ ...placeFields, ...visitFields });

type FormInput = z.input<typeof fullSchema>;
type FormOutput = z.output<typeof fullSchema>;

const fullResolver = zodResolver(fullSchema);
// Для «Хотим посетить» поля посещения не проверяются; на выходе их просто нет — их и не читаем.
const placeResolver = zodResolver(placeSchema) as unknown as typeof fullResolver;

type PlaceFormProps = {
  /** Новое место (из поиска или точкой) — либо существующее для редактирования. */
  draft: PlaceDraft | null;
  item: PlaceItem | null;
  onClose: () => void;
  onSaved?: (placeId: string) => void;
};

export function PlaceForm({ draft, item, onClose, onSaved }: PlaceFormProps) {
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const place = item?.place ?? null;
  const isNew = place === null;
  // Статус меняется вручную, пока посещений нет; дальше «Были» следует из истории.
  const canChangeStatus = isNew || item?.stats.visits.length === 0;
  // Посещение заполняется прямо в форме только при добавлении места («Выбрал → Были → Оценки»).
  const withVisit = (status: PlaceStatus) => isNew && status === 'visited';

  const resolver: Resolver<FormInput, unknown, FormOutput> = (values, context, options) =>
    withVisit(values.status)
      ? fullResolver(values, context, options)
      : placeResolver(values, context, options);

  const methods = useForm<FormInput, unknown, FormOutput>({
    resolver,
    defaultValues: {
      name: place?.name ?? draft?.name ?? '',
      address: place?.address ?? draft?.address ?? '',
      category: place?.category ?? draft?.category ?? 'other',
      status: place?.status ?? 'visited',
      note: place?.note ?? '',
      ...visitDefaults(null, todayIsoDate()),
    },
  });
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = methods;
  const status = useWatch({ control, name: 'status' });

  const del = useConfirmDelete<PlaceItem>({
    ...placeDeleteCopy,
    remove: (i) =>
      deletePlace(
        i.place.id,
        i.stats.visits.map((v) => v.id),
      ),
    doneMessage: 'Место удалено',
    onDone: onClose,
  });

  const source = place ?? draft;

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      if (place) {
        await updatePlace(place.id, {
          name: v.name,
          address: v.address,
          city: place.city,
          latitude: place.latitude,
          longitude: place.longitude,
          category: v.category,
          status: canChangeStatus ? v.status : place.status,
          note: v.note,
        });
        toast('Изменения сохранены');
        onClose();
      } else if (draft) {
        const visit = withVisit(v.status) ? toVisitInput(v) : null;
        const id = await createPlace(
          {
            ...draft,
            name: v.name,
            address: v.address,
            category: v.category,
            status: v.status,
            note: visit ? null : v.note,
          },
          visit,
        );
        toast(
          v.status === 'visited' ? 'Место и посещение сохранены' : 'Добавили в «Хотим посетить»',
        );
        onSaved?.(id);
        onClose();
      }
    } catch (e) {
      setError(getErrorMessage(e));
    }
  });

  return (
    <>
      <Panel
        open={!del.isOpen}
        onClose={onClose}
        title={isNew ? 'Добавить место' : 'Изменить место'}
        onSubmit={onSubmit}
        submitLabel="Сохранить"
        saving={isSubmitting}
        error={error}
        onDelete={item ? () => del.ask(item) : undefined}
      >
        {source && (
          <p className="hint" style={{ marginTop: -8 }}>
            {source.provider === 'osm'
              ? 'Найдено в OpenStreetMap — название и адрес можно поправить.'
              : `Своя точка на карте: ${formatCoords(source)}`}
          </p>
        )}
        <Field label="Название" error={errors.name?.message}>
          {(p) => (
            <TextInput
              {...p}
              placeholder="Например, смотровая на крыше"
              autoFocus={isNew && !draft?.name}
              {...register('name')}
            />
          )}
        </Field>
        <div className="row2">
          <Field label="Адрес" optional="если есть" error={errors.address?.message}>
            {(p) => <TextInput {...p} placeholder="Улица, дом" {...register('address')} />}
          </Field>
          <Field label="Категория">
            {(p) => (
              <Select {...p} {...register('category')}>
                {PLACE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        {canChangeStatus && (
          <div className="field">
            <span className="label" id="place-status">
              Статус
            </span>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Segmented<PlaceStatus>
                  full
                  ariaLabelledBy="place-status"
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    { value: 'visited', label: STATUS_LABEL.visited },
                    { value: 'want-to-visit', label: STATUS_LABEL['want-to-visit'] },
                  ]}
                />
              )}
            />
          </div>
        )}
        {withVisit(status) ? (
          <FormProvider {...methods}>
            <VisitFields />
          </FormProvider>
        ) : (
          <Field label="Заметка о месте" optional="если хочется" error={errors.note?.message}>
            {(p) => (
              <TextArea
                {...p}
                rows={2}
                placeholder={
                  status === 'want-to-visit'
                    ? 'Почему хочется сходить, что посоветовали'
                    : 'Что важно помнить про место'
                }
                {...register('note')}
              />
            )}
          </Field>
        )}
      </Panel>
      {del.dialog}
    </>
  );
}
