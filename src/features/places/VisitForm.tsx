import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Panel } from '@/components/ui/Panel';
import { useConfirmDelete } from '@/components/ui/useConfirmDelete';
import { useToast } from '@/components/ui/useToast';
import { getErrorMessage } from '@/lib/firebase/errors';
import { todayIsoDate } from '@/lib/format/dates';
import type { Place, PlaceVisit } from '@/types/models';
import { createVisit, deleteVisit, updateVisit } from './api';
import { toVisitInput, visitDefaults, visitSchema, type VisitValues } from './placeForms';
import { visitDeleteCopy } from './placesView';
import { VisitFields } from './VisitFields';

type VisitFormProps = { place: Place; visit: PlaceVisit | null; onClose: () => void };

export function VisitForm({ place, visit, onClose }: VisitFormProps) {
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const methods = useForm<VisitValues, unknown, z.output<typeof visitSchema>>({
    resolver: zodResolver(visitSchema),
    defaultValues: visitDefaults(visit, todayIsoDate()),
  });
  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const del = useConfirmDelete<PlaceVisit>({
    ...visitDeleteCopy,
    remove: (v) => deleteVisit(v.id),
    doneMessage: 'Посещение удалено',
    onDone: onClose,
  });

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      if (visit) await updateVisit(visit.id, toVisitInput(v));
      else await createVisit(place, toVisitInput(v));
      toast(visit ? 'Изменения сохранены' : 'Посещение записано');
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
        title={visit ? 'Изменить посещение' : 'Новое посещение'}
        onSubmit={onSubmit}
        submitLabel="Сохранить"
        saving={isSubmitting}
        error={error}
        onDelete={visit ? () => del.ask(visit) : undefined}
      >
        <p className="sub small">{place.name}</p>
        <FormProvider {...methods}>
          <VisitFields />
        </FormProvider>
      </Panel>
      {del.dialog}
    </>
  );
}
