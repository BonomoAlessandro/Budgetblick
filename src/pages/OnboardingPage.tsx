import { addMonths, startOfMonth } from 'date-fns';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Field } from '../components/fields';
import { IncomeForm } from '../components/IncomeForm';
import { buttonClass, inputClass } from '../components/styles';
import { useCategoryMap, useIncomes, useRecurringExpenses } from '../db/hooks';
import { db } from '../db/db';
import { deleteRecurringExpense, saveIncome, saveRecurringExpense, setSetting } from '../db/repo';
import { sumMonthly } from '../lib/budget';
import { toISODate } from '../lib/date';
import { INTERVALS, INTERVAL_LABELS } from '../lib/interval';
import { parseAmount, formatCHF, toInputValue } from '../lib/money';
import {
  FIXED_COST_SUGGESTIONS,
  SETTING_ONBOARDING_DONE,
  SETTING_ONBOARDING_IN_PROGRESS,
  type FixedCostSuggestion,
} from '../lib/onboarding';
import type { Interval } from '../types';

const STEPS = ['Einkommen', 'Fixkosten', 'Fertig'] as const;

function StepLayout({
  step,
  title,
  intro,
  children,
  onSkipAll,
}: {
  step: number;
  title: string;
  intro: ReactNode;
  children: ReactNode;
  onSkipAll?: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <div className="mb-6 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Schritt {step + 1} von {STEPS.length}
        </p>
        {onSkipAll && (
          <button
            type="button"
            className={buttonClass('ghost', 'px-3 text-sm')}
            onClick={onSkipAll}
          >
            Einrichtung überspringen
          </button>
        )}
      </div>
      <div aria-hidden="true" className="mb-6 grid grid-cols-3 gap-1.5">
        {STEPS.map((s, i) => (
          <span
            key={s}
            className={`h-1.5 rounded-full ${i <= step ? 'bg-brand-600' : 'bg-slate-200 dark:bg-slate-800'}`}
          />
        ))}
      </div>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <div className="mt-2 mb-6 text-slate-600 dark:text-slate-400">{intro}</div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

/** Kleines Formular für einen Vorschlag: nur Name, Betrag und Intervall. */
function SuggestionForm({
  suggestion,
  onAdd,
  onCancel,
}: {
  suggestion: FixedCostSuggestion;
  onAdd: (values: { name: string; amount: number; interval: Interval }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(suggestion.name);
  const [amount, setAmount] = useState(
    suggestion.amount !== undefined ? toInputValue(suggestion.amount) : '',
  );
  const [interval, setIntervalValue] = useState<Interval>(suggestion.interval);
  const [error, setError] = useState<string>();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = parseAmount(amount);
    if (parsed === null || parsed === 0 || !name.trim()) {
      setError(!name.trim() ? 'Bitte einen Namen eingeben.' : 'Bitte einen Betrag eingeben.');
      return;
    }
    onAdd({ name: name.trim(), amount: parsed, interval });
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label={`${suggestion.name} erfassen`}
      className="space-y-3 rounded-2xl border border-brand-600 bg-white p-4 dark:bg-slate-900"
    >
      <Field label="Bezeichnung">
        {(p) => (
          <input
            {...p}
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Betrag (CHF)" error={error}>
          {(p) => (
            <input
              {...p}
              autoFocus
              inputMode="decimal"
              placeholder="0.00"
              className={inputClass}
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
      <div className="flex justify-end gap-2">
        <button type="button" className={buttonClass('ghost')} onClick={onCancel}>
          Abbrechen
        </button>
        <button type="submit" className={buttonClass('primary')}>
          Hinzufügen
        </button>
      </div>
    </form>
  );
}

function FixedCostsStep({ onNext }: { onNext: () => void }) {
  const recurring = useRecurringExpenses() ?? [];
  const categoryMap = useCategoryMap();
  const [selected, setSelected] = useState<FixedCostSuggestion | null>(null);
  const nextMonth = toISODate(startOfMonth(addMonths(new Date(), 1)));
  const addedNames = new Set(recurring.map((r) => r.name));

  return (
    <div className="space-y-4">
      {recurring.length > 0 && (
        <section aria-label="Erfasste Fixkosten" className="space-y-2">
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
            {recurring.map((r) => (
              <li key={r.id} className="flex min-h-12 items-center gap-3 px-4 py-2">
                <span aria-hidden="true">{r.icon ?? categoryMap.get(r.categoryId)?.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{r.name}</span>
                  <span className="block text-sm text-slate-500 dark:text-slate-400">
                    {formatCHF(r.amount)} {INTERVAL_LABELS[r.interval].toLowerCase()}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label={`${r.name} entfernen`}
                  className="flex size-11 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => void deleteRecurringExpense(r.id)}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <p className="text-right text-sm font-semibold">
            Total pro Monat: {formatCHF(sumMonthly(recurring))}
          </p>
        </section>
      )}

      {selected ? (
        <SuggestionForm
          key={selected.name}
          suggestion={selected}
          onCancel={() => setSelected(null)}
          onAdd={async (values) => {
            await saveRecurringExpense({
              ...values,
              categoryId: selected.categoryId,
              icon: selected.icon,
              nextDueDate: nextMonth,
              active: true,
            });
            setSelected(null);
          }}
        />
      ) : (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Typische Posten
          </h2>
          <ul className="flex flex-wrap gap-2" aria-label="Vorschläge">
            {FIXED_COST_SUGGESTIONS.filter((s) => !addedNames.has(s.name)).map((s) => (
              <li key={s.name}>
                <button
                  type="button"
                  onClick={() => setSelected(s)}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 text-sm font-medium hover:border-brand-600 hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                >
                  <span aria-hidden="true">{s.icon ?? categoryMap.get(s.categoryId)?.icon}</span>
                  {s.name}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Weitere Posten und Vertragsdetails kannst du später jederzeit unter „Fixkosten"
            erfassen.
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <button
          type="button"
          className={buttonClass(recurring.length > 0 ? 'primary' : 'secondary')}
          onClick={onNext}
        >
          {recurring.length > 0 ? 'Weiter' : 'Überspringen'}
        </button>
      </div>
    </div>
  );
}

function DoneStep({ onFinish }: { onFinish: () => void }) {
  const incomes = useIncomes() ?? [];
  const recurring = useRecurringExpenses() ?? [];
  const income = sumMonthly(incomes);
  const fixed = sumMonthly(recurring);

  return (
    <div className="space-y-6">
      {income > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Pro Monat frei verfügbar für variable Ausgaben
          </p>
          <p className="text-3xl font-bold">{formatCHF(income - fixed)}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {formatCHF(income)} Einkommen − {formatCHF(fixed)} Fixkosten
          </p>
        </div>
      )}
      <ul className="space-y-3 text-slate-700 dark:text-slate-300">
        <li>
          ➕ Mit dem „+"-Button erfasst du Ausgaben in wenigen Sekunden – auch per Quittungsfoto.
        </li>
        <li>📄 Unter „Verträge" behältst du Kündigungsfristen im Blick.</li>
        <li>
          🔒 Alle Daten bleiben auf diesem Gerät. Sichere sie regelmässig in den Einstellungen.
        </li>
      </ul>
      <button type="button" className={buttonClass('primary', 'w-full')} onClick={onFinish}>
        Los geht's
      </button>
    </div>
  );
}

/** Einrichtungs-Assistent beim allerersten Start. Jeder Schritt ist überspringbar. */
export function OnboardingPage() {
  const [step, setStep] = useState(0);
  const incomes = useIncomes() ?? [];
  useEffect(() => {
    void setSetting(SETTING_ONBOARDING_IN_PROGRESS, true);
  }, []);

  const finish = () =>
    void db.transaction('rw', db.settings, async () => {
      await db.settings.put({ key: SETTING_ONBOARDING_DONE, value: true });
      await db.settings.delete(SETTING_ONBOARDING_IN_PROGRESS);
    });

  if (step === 0) {
    return (
      <StepLayout
        step={0}
        title="Willkommen bei Budgetblick"
        intro="Wie viel Geld hast du im Monat wirklich zur Verfügung? Beginne mit deinem Einkommen."
        onSkipAll={finish}
      >
        <IncomeForm
          initial={incomes[0]}
          onSubmit={async (draft) => {
            await saveIncome(draft);
            setStep(1);
          }}
        />
        <button
          type="button"
          className={buttonClass('ghost', 'mt-2 w-full')}
          onClick={() => setStep(1)}
        >
          Überspringen
        </button>
      </StepLayout>
    );
  }
  if (step === 1) {
    return (
      <StepLayout
        step={1}
        title="Deine wichtigsten Fixkosten"
        intro="Tippe auf einen Vorschlag und trage den Betrag ein. Die App rechnet alles auf Monatsbeträge um."
        onSkipAll={finish}
      >
        <FixedCostsStep onNext={() => setStep(2)} />
      </StepLayout>
    );
  }
  return (
    <StepLayout step={2} title="Fertig eingerichtet" intro="So geht es weiter:">
      <DoneStep onFinish={finish} />
    </StepLayout>
  );
}
