import { useRef, useState } from 'react';
import { useCategories, useRecentExpenses } from '../db/hooks';
import { todayISO } from '../lib/date';
import { topCategories } from '../lib/expenses';
import { parseAmount } from '../lib/money';
import type { Category, Expense } from '../types';
import { Field } from './fields';
import { inputClass } from './styles';

export type NewExpense = Omit<Expense, 'id'>;

interface QuickAddProps {
  onSave: (expense: NewExpense, category: Category) => void;
  /** Foto einer Quittung wurde gewählt */
  onScan: (file: File) => void;
  /** QR-Code einer Rechnung mit der Kamera lesen */
  onQrScan: () => void;
}

const scanButtonClass =
  'flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-2 text-center font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800';

/** Anzahl Ausgaben, die für die Häufigkeit der Kategorien berücksichtigt werden. */
const USAGE_SAMPLE = 200;

function CategoryButton({ category, onClick }: { category: Category; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-2 text-sm font-medium hover:bg-slate-100 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
    >
      <span aria-hidden="true" className="text-2xl">
        {category.icon}
      </span>
      <span className="line-clamp-2 text-center leading-tight">{category.name}</span>
    </button>
  );
}

/**
 * Schnellerfassung: Betrag eintippen, Kategorie antippen – gespeichert.
 * Datum, Händler und Notiz sind optional aufklappbar.
 */
export function QuickAdd({ onSave, onScan, onQrScan }: QuickAddProps) {
  const categories = useCategories('variable');
  const recent = useRecentExpenses(USAGE_SAMPLE);
  const amountRef = useRef<HTMLInputElement>(null);

  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string>();
  const [showAll, setShowAll] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [merchant, setMerchant] = useState('');
  const [note, setNote] = useState('');

  // Das Betragsfeld wird sofort gerendert (Fokus beim Öffnen), die Kategorien sobald geladen.
  const top = categories && recent ? topCategories(recent, categories, 6) : [];
  const rest = (categories ?? []).filter((c) => !top.includes(c));

  function save(category: Category) {
    const parsed = parseAmount(amount);
    if (parsed === null || parsed === 0) {
      setError('Bitte zuerst einen Betrag eingeben.');
      amountRef.current?.focus();
      return;
    }
    onSave(
      {
        amount: parsed,
        date: date || todayISO(),
        categoryId: category.id,
        merchant: merchant.trim() || undefined,
        note: note.trim() || undefined,
        source: 'manual',
      },
      category,
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="quick-amount" className="sr-only">
          Betrag in CHF
        </label>
        <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-600/30 dark:border-slate-700 dark:bg-slate-950">
          <span className="text-2xl font-semibold text-slate-400" aria-hidden="true">
            CHF
          </span>
          <input
            ref={amountRef}
            id="quick-amount"
            data-autofocus
            inputMode="decimal"
            enterKeyHint="done"
            autoComplete="off"
            placeholder="0.00"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'quick-amount-error' : undefined}
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError(undefined);
            }}
            className="min-h-16 w-full bg-transparent text-4xl font-bold tabular-nums outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
          />
        </div>
        {error && (
          <p id="quick-amount-error" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div
          role="group"
          aria-label="Kategorie wählen und speichern"
          className="grid grid-cols-3 gap-2"
        >
          {top.map((c) => (
            <CategoryButton key={c.id} category={c} onClick={() => save(c)} />
          ))}
          {showAll &&
            rest.map((c) => <CategoryButton key={c.id} category={c} onClick={() => save(c)} />)}
        </div>
        {rest.length > 0 && (
          <button
            type="button"
            aria-expanded={showAll}
            onClick={() => setShowAll((v) => !v)}
            className="min-h-11 w-full rounded-xl text-sm font-medium text-brand-700 hover:bg-brand-50 dark:text-brand-500 dark:hover:bg-slate-800"
          >
            {showAll ? 'Weniger Kategorien' : `Weitere Kategorien (${rest.length})`}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label
          className={`${scanButtonClass} focus-within:outline-2 focus-within:outline-brand-600`}
        >
          <span aria-hidden="true">📷</span>
          Quittung scannen
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) onScan(file);
            }}
          />
        </label>
        <button type="button" className={scanButtonClass} onClick={onQrScan}>
          <span aria-hidden="true">🔳</span>
          QR-Rechnung
        </button>
      </div>

      <details className="group rounded-xl border border-slate-200 dark:border-slate-700">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 font-medium">
          Datum, Händler, Notiz
          <span aria-hidden="true" className="transition-transform group-open:rotate-180">
            ▾
          </span>
        </summary>
        <div className="space-y-3 px-3 pb-3">
          <Field label="Datum">
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
        </div>
      </details>
    </div>
  );
}
