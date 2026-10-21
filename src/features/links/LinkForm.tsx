import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Field, Select, TextInput } from '@/components/ui/Field';
import { Panel } from '@/components/ui/Panel';
import { useToast } from '@/components/ui/useToast';
import { useConfirmDelete } from '@/components/ui/useConfirmDelete';
import { getErrorMessage } from '@/lib/firebase/errors';
import { optionalText, requiredUrl, titleField } from '@/lib/forms';
import type { LinkItem } from '@/types/models';
import { LINK_TYPE_VALUES, createLink, deleteLink, updateLink } from './api';
import { LINK_TYPES, linkDeleteCopy } from './linkTypes';

const schema = z.object({
  title: titleField(),
  url: requiredUrl,
  type: z.enum(LINK_TYPE_VALUES),
  description: optionalText(300),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

export function LinkForm({ link, onClose }: { link: LinkItem | null; onClose: () => void }) {
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: link?.title ?? '',
      url: link?.url ?? '',
      type: link?.type ?? 'workspace',
      description: link?.description ?? '',
    },
  });

  const del = useConfirmDelete<LinkItem>({
    ...linkDeleteCopy,
    remove: (l) => deleteLink(l.id),
    doneMessage: 'Ссылка удалена',
    onDone: onClose,
  });

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      if (link) await updateLink(link.id, v);
      else await createLink(v);
      toast(link ? 'Изменения сохранены' : 'Ссылка добавлена');
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
        title={link ? 'Изменить ссылку' : 'Новая ссылка'}
        onSubmit={onSubmit}
        submitLabel="Сохранить"
        saving={isSubmitting}
        error={error}
        onDelete={link ? () => del.ask(link) : undefined}
      >
        <Field label="Название" error={errors.title?.message}>
          {(p) => (
            <TextInput
              {...p}
              placeholder="Например, Notion — планы"
              autoFocus={!link}
              {...register('title')}
            />
          )}
        </Field>
        <Field label="Ссылка" error={errors.url?.message}>
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
        <Field label="Тип">
          {(p) => (
            <Select {...p} {...register('type')}>
              {LINK_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Описание" optional="одна фраза" error={errors.description?.message}>
          {(p) => <TextInput {...p} placeholder="Что там лежит" {...register('description')} />}
        </Field>
      </Panel>
      {del.dialog}
    </>
  );
}
