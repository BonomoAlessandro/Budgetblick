import { useState, type FormEvent } from 'react';
import type { Category, CategoryKind } from '../types';
import { ConfirmDeleteButton, Field } from './fields';
import { buttonClass, inputClass } from './styles';

export type CategoryDraft = Omit<Category, 'id'> & { id?: string };

interface CategoryFormProps {
  initial?: Category;
  defaultKind?: CategoryKind;
  /** Anzahl Einträge, die diese Kategorie verwenden (Löschen nur wenn 0) */
  usageCount?: number;
  onSubmit: (category: CategoryDraft) => void;
  onDelete?: () => void;
}

export function CategoryForm({
  initial,
  defaultKind = 'variable',
  usageCount = 0,
  onSubmit,
  onDelete,
}: CategoryFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? '📦');
  const [color, setColor] = useState(initial?.color ?? '#64748b');
  const [kind, setKind] = useState<CategoryKind>(initial?.kind ?? defaultKind);
  const [errors, setErrors] = useState<{ name?: string; icon?: string }>({});

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next = {
      name: name.trim() ? undefined : 'Bitte einen Namen eingeben.',
      icon: icon.trim() ? undefined : 'Bitte ein Emoji eingeben.',
    };
    setErrors(next);
    if (next.name || next.icon) return;
    onSubmit({ id: initial?.id, name: name.trim(), icon: icon.trim(), color, kind });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Field label="Name" error={errors.name}>
        {(p) => (
          <input
            {...p}
            data-autofocus
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
          />
        )}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Symbol (Emoji)" error={errors.icon}>
          {(p) => (
            <input
              {...p}
              className={`${inputClass} text-xl`}
              value={icon}
              maxLength={8}
              onChange={(e) => setIcon(e.target.value)}
              autoComplete="off"
            />
          )}
        </Field>
        <Field label="Farbe">
          {(p) => (
            <input
              {...p}
              type="color"
              className={`${inputClass} h-11 p-1`}
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          )}
        </Field>
      </div>
      {!initial && (
        <Field label="Art">
          {(p) => (
            <select
              {...p}
              className={inputClass}
              value={kind}
              onChange={(e) => setKind(e.target.value as CategoryKind)}
            >
              <option value="variable">Variable Ausgaben</option>
              <option value="fixed">Fixkosten</option>
            </select>
          )}
        </Field>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
        {onDelete && usageCount === 0 ? (
          <ConfirmDeleteButton onConfirm={onDelete} />
        ) : onDelete ? (
          <p className="max-w-[60%] text-sm text-slate-500 dark:text-slate-400">
            Wird von {usageCount} {usageCount === 1 ? 'Eintrag' : 'Einträgen'} verwendet und kann
            nicht gelöscht werden.
          </p>
        ) : (
          <span />
        )}
        <button type="submit" className={buttonClass('primary')}>
          Speichern
        </button>
      </div>
    </form>
  );
}
