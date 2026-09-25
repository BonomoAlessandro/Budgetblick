import { useState, type FormEvent } from 'react';
import { todayISO } from '../lib/date';
import { INTERVALS, INTERVAL_LABELS } from '../lib/interval';
import { parseAmount, toInputValue } from '../lib/money';
import type { Category, Interval, RecurringExpense } from '../types';
import { ConfirmDeleteButton, Field } from './fields';
import { buttonClass, inputClass } from './styles';

export type RecurringExpenseDraft = Omit<RecurringExpense, 'id'> & { id?: string };

interface RecurringExpenseFormProps {
  initial?: RecurringExpense;
  categories: Category[];
  onSubmit: (expense: RecurringExpenseDraft) => void;
  onDelete?: () => void;
}

interface Errors {
  name?: string;
  amount?: string;
  nextDueDate?: string;
  categoryId?: string;
}

export function RecurringExpenseForm({
  initial,
  categories,
  onSubmit,
  onDelete,
}: RecurringExpenseFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [amount, setAmount] = useState(initial ? toInputValue(initial.amount) : '');
  const [interval, setIntervalValue] = useState<Interval>(initial?.interval ?? 'monthly');
  const [nextDueDate, setNextDueDate] = useState(initial?.nextDueDate ?? todayISO());
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? categories[0]?.id ?? '');
  const [active, setActive] = useState(initial?.active ?? true);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [errors, setErrors] = useState<Errors>({});

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = parseAmount(amount);
    const next: Errors = {
      name: name.trim() ? undefined : 'Bitte einen Namen eingeben.',
      amount: parsed === null ? 'Bitte einen gültigen Betrag eingeben, z. B. 42.50.' : undefined,
      nextDueDate: /^\d{4}-\d{2}-\d{2}$/.test(nextDueDate)
        ? undefined
        : 'Bitte ein gültiges Datum wählen.',
      categoryId: categoryId ? undefined : 'Bitte eine Kategorie wählen.',
    };
    setErrors(next);
    if (Object.values(next).some(Boolean) || parsed === null) return;
    onSubmit({
      ...initial,
      id: initial?.id,
      name: name.trim(),
      amount: parsed,
      interval,
      nextDueDate,
      categoryId,
      active,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Field label="Bezeichnung" error={errors.name}>
        {(p) => (
          <input
            {...p}
            className={inputClass}
            placeholder="z. B. Krankenkasse Grundversicherung"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
          />
        )}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Betrag (CHF)" error={errors.amount}>
          {(p) => (
            <input
              {...p}
              className={inputClass}
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          )}
        </Field>
        <Field label="Intervall">
          {(p) => (
            <select
              {...p}
              className={inputClass}
              value={interval}
              onChange={(e) => setIntervalValue(e.target.value as Interval)}
            >
              {INTERVALS.map((i) => (
                <option key={i} value={i}>
                  {INTERVAL_LABELS[i]}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nächste Fälligkeit" error={errors.nextDueDate}>
          {(p) => (
            <input
              {...p}
              type="date"
              className={inputClass}
              value={nextDueDate}
              onChange={(e) => setNextDueDate(e.target.value)}
            />
          )}
        </Field>
        <Field label="Kategorie" error={errors.categoryId}>
          {(p) => (
            <select
              {...p}
              className={inputClass}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>
      <Field label="Notizen">
        {(p) => (
          <textarea
            {...p}
            rows={2}
            className={inputClass}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        )}
      </Field>
      <label className="flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          className="size-5 accent-brand-700"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />
        <span>Aktiv (fliesst ins Budget ein)</span>
      </label>
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
        {onDelete ? <ConfirmDeleteButton onConfirm={onDelete} /> : <span />}
        <button type="submit" className={buttonClass('primary')}>
          Speichern
        </button>
      </div>
    </form>
  );
}
