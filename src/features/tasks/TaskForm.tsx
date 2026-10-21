import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { DateInput, Field, MoneyInput, TextArea, TextInput } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Panel } from '@/components/ui/Panel';
import { useToast } from '@/components/ui/useToast';
import { useConfirmDelete } from '@/components/ui/useConfirmDelete';
import { getErrorMessage } from '@/lib/firebase/errors';
import { isIsoDate } from '@/lib/format/dates';
import { minorToRublesInput, parseRublesToMinor } from '@/lib/format/money';
import { optionalDate, optionalMoney, optionalText, titleField } from '@/lib/forms';
import type { Task } from '@/types/models';
import { createTask, deleteTask, updateTask } from './api';
import { TagPicker } from './TagPicker';
import { taskCopyText, taskDeleteCopy } from './taskView';

const schema = z.object({
  title: titleField(),
  dueDate: optionalDate,
  cost: optionalMoney,
  description: optionalText(),
  tags: z.array(z.string()).max(10),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

type TaskFormProps = {
  task: Task | null;
  /** Разделы других дел — для выбора чипами. */
  knownTags: string[];
  defaultDueDate?: string;
  onClose: () => void;
};

/** Новое дело / изменить дело — боковая панель или bottom sheet. */
export function TaskForm({ task, knownTags, defaultDueDate = '', onClose }: TaskFormProps) {
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [showNote, setShowNote] = useState(Boolean(task?.description));
  const {
    register,
    control,
    getValues,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: task?.title ?? '',
      dueDate: task?.dueDate ?? defaultDueDate,
      cost: task?.estimatedCostMinor ? minorToRublesInput(task.estimatedCostMinor) : '',
      description: task?.description ?? '',
      tags: task?.tags ?? [],
    },
  });

  const del = useConfirmDelete<Task>({
    ...taskDeleteCopy,
    remove: (t) => deleteTask(t.id),
    doneMessage: 'Дело удалено',
    onDone: onClose,
  });

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    const input = {
      title: v.title,
      dueDate: v.dueDate,
      estimatedCostMinor: v.cost,
      description: v.description,
      tags: v.tags,
    };
    try {
      if (task) await updateTask(task.id, input);
      else await createTask(input);
      toast(task ? 'Изменения сохранены' : 'Дело добавлено');
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
        title={task ? 'Изменить дело' : 'Новое дело'}
        onSubmit={onSubmit}
        submitLabel="Сохранить"
        saving={isSubmitting}
        error={error}
        onDelete={task ? () => del.ask(task) : undefined}
        copyText={
          task
            ? () => {
                // Копируем то, что сейчас в форме (в том числе несохранённые правки), без пустых полей.
                const v = getValues();
                return taskCopyText({
                  title: v.title || task.title,
                  dueDate: isIsoDate(v.dueDate) ? v.dueDate : null,
                  estimatedCostMinor: parseRublesToMinor(v.cost),
                  tags: v.tags,
                  description: v.description.trim() || null,
                  isCompleted: task.isCompleted,
                });
              }
            : undefined
        }
      >
        <Field label="Название" error={errors.title?.message}>
          {(p) => (
            <TextInput
              {...p}
              placeholder="Например, оплатить интернет"
              autoFocus={!task}
              {...register('title')}
            />
          )}
        </Field>
        <div className="row2">
          <Field label="Срок" optional="если есть" error={errors.dueDate?.message}>
            {(p) => <DateInput {...p} {...register('dueDate')} />}
          </Field>
          <Field label="Стоимость" optional="если есть" error={errors.cost?.message}>
            {(p) => <MoneyInput {...p} {...register('cost')} />}
          </Field>
        </div>
        <Controller
          control={control}
          name="tags"
          render={({ field }) => (
            <TagPicker value={field.value} onChange={field.onChange} known={knownTags} />
          )}
        />
        {showNote ? (
          <Field label="Заметка" error={errors.description?.message}>
            {(p) => (
              <TextArea
                {...p}
                rows={3}
                placeholder="Детали, которые важно не забыть"
                {...register('description')}
              />
            )}
          </Field>
        ) : (
          <button type="button" className="textlink" onClick={() => setShowNote(true)}>
            <Icon name="plus" />
            Добавить заметку
          </button>
        )}
      </Panel>
      {del.dialog}
    </>
  );
}
