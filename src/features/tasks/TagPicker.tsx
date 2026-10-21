import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { cx } from '@/components/ui/cx';
import { FieldError } from '@/components/ui/Field';
import { MAX_TAGS_PER_TASK, normalizeTag, sameTag } from './taskView';

type TagPickerProps = {
  value: string[];
  onChange: (tags: string[]) => void;
  /** Разделы, которые уже есть у других дел, — предлагаются чипами. */
  known: string[];
};

/** Разделы дела: выбор из существующих чипами + создание нового. */
export function TagPicker({ value, onChange, known }: TagPickerProps) {
  const id = useId();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const options = [...known, ...value.filter((v) => !known.some((k) => sameTag(k, v)))];

  const toggle = (tag: string) => {
    setError(null);
    if (value.some((v) => sameTag(v, tag))) onChange(value.filter((v) => !sameTag(v, tag)));
    else if (value.length >= MAX_TAGS_PER_TASK)
      setError(`Не больше ${MAX_TAGS_PER_TASK} разделов у одного дела`);
    else onChange([...value, tag]);
  };

  const add = () => {
    const tag = normalizeTag(draft);
    if (!tag) return;
    // Если такой раздел уже есть (в другом регистре) — берём существующее написание.
    const existing = options.find((o) => sameTag(o, tag)) ?? tag;
    setDraft('');
    if (!value.some((v) => sameTag(v, existing))) toggle(existing);
  };

  return (
    <div className="field">
      <label className="label" htmlFor={`${id}-new`}>
        Разделы<span className="opt"> · если нужно</span>
      </label>
      {options.length > 0 && (
        <div
          className="chips"
          role="group"
          aria-label="Разделы дела"
          style={{ flexWrap: 'wrap', overflow: 'visible', margin: 0, padding: 0 }}
        >
          {options.map((tag) => {
            const on = value.some((v) => sameTag(v, tag));
            return (
              <button
                key={tag}
                type="button"
                className={cx('chip', on && 'is-on')}
                aria-pressed={on}
                onClick={() => toggle(tag)}
              >
                {tag}
              </button>
            );
          })}
        </div>
      )}
      <div className="tag-add">
        <input
          id={`${id}-new`}
          className="input"
          value={draft}
          maxLength={30}
          placeholder={options.length ? 'Новый раздел' : 'Например, Медицина'}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button variant="secondary" icon="plus" onClick={add} disabled={!normalizeTag(draft)}>
          Добавить
        </Button>
      </div>
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}
