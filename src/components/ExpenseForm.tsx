import { useState, type FormEvent } from 'react';
import { todayISO } from '../lib/date';
import { parseAmount, toInputValue } from '../lib/money';
import type { Category, Expense } from '../types';
import { ConfirmDeleteButton, Field } from './fields';
import { buttonClass, inputClass } from './styles';

export type ExpenseDraft = Omit<Expense, 'id'> & { id?: string };

interface ExpenseFormProps {
  /** Bestehende Ausgabe oder vorausgefüllte Werte (z. B. aus dem Quittungsscan) */
  initial: Partial<Expense>;
  categories: Category[];
  onSubmit: (expense: ExpenseDraft) => void;
  onDelete?: () => void;
  submitLabel?: string;
}

interface Errors {
  amount?: string;
  date?: string;
}

function ReceiptPreview({ image }: { image: Blob }) {
  // Objekt-URL an die Lebensdauer des <img> binden (Ref-Callback mit Aufräumfunktion).
  return (
    <img
      ref={(el) => {
        if (!el) return;
        const url = URL.createObjectURL(image);
        el.src = url;
        return () => URL.revokeObjectURL(url);
      }}
      alt="Quittung"
      className="max-h-64 w-full rounded-xl border border-slate-200 object-contain dark:border-slate-700"
    />
  );
}

export function ExpenseForm({
  initial,
  categories,
  onSubmit,
  onDelete,
  submitLabel = 'Speichern',
}: ExpenseFormProps) {
  const [amount, setAmount] = useState(
    initial.amount !== undefined ? toInputValue(initial.amount) : '',
  );
  const [date, setDate] = useState(initial.date ?? todayISO());
  const [categoryId, setCategoryId] = useState(initial.categoryId ?? categories[0]?.id ?? '');
  const [merchant, setMerchant] = useState(initial.merchant ?? '');
  const [note, setNote] = useState(initial.note ?? '');
  const [errors, setErrors] = useState<Errors>({});

  // Gelöschte Kategorie: trotzdem als Option anzeigen, damit sie nicht stillschweigend wechselt.
  const options = categories.some((c) => c.id === categoryId)
    ? categories
    : [{ id: categoryId, name: 'Unbekannte Kategorie', icon: '❔' } as Category, ...categories];

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = parseAmount(amount);
    const next: Errors = {
      amount:
        parsed === null || parsed === 0
          ? 'Bitte einen gültigen Betrag eingeben, z. B. 12.50.'
          : undefined,
      date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? undefined : 'Bitte ein gültiges Datum wählen.',
    };
    setErrors(next);
    if (next.amount || next.date || parsed === null) return;
    onSubmit({
      ...initial,
      amount: parsed,
      date,
      categoryId,
      merchant: merchant.trim() || undefined,
      note: note.trim() || undefined,
      source: initial.source ?? 'manual',
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Betrag (CHF)" error={errors.amount}>
          {(p) => (
            <input
              {...p}
              data-autofocus
              className={inputClass}
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          )}
        </Field>
        <Field label="Datum" error={errors.date}>
          {(p) => (
            <input
              {...p}
              type="date"
              className={inputClass}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          )}
        </Field>
      </div>
      <Field label="Kategorie">
        {(p) => (
          <select
            {...p}
            className={inputClass}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            {options.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label="Händler">
        {(p) => (
          <input
            {...p}
            className={inputClass}
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            autoComplete="off"
          />
        )}
      </Field>
      <Field label="Notiz">
        {(p) => (
          <input
            {...p}
            className={inputClass}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            autoComplete="off"
          />
        )}
      </Field>
      {initial.receiptImage && <ReceiptPreview image={initial.receiptImage} />}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
        {onDelete ? <ConfirmDeleteButton onConfirm={onDelete} /> : <span />}
        <button type="submit" className={buttonClass('primary')}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
