import { useState, type FormEvent } from 'react';
import { INTERVALS, INTERVAL_LABELS } from '../lib/interval';
import { parseAmount, toInputValue } from '../lib/money';
import type { Income, Interval } from '../types';
import { ConfirmDeleteButton, Field } from './fields';
import { buttonClass, inputClass } from './styles';

interface IncomeFormProps {
  initial?: Income;
  onSubmit: (income: Omit<Income, 'id'> & { id?: string }) => void;
  onDelete?: () => void;
}

export function IncomeForm({ initial, onSubmit, onDelete }: IncomeFormProps) {
  const [name, setName] = useState(initial?.name ?? 'Lohn');
  const [amount, setAmount] = useState(initial ? toInputValue(initial.amount) : '');
  const [interval, setIntervalValue] = useState<Interval>(initial?.interval ?? 'monthly');
  const [errors, setErrors] = useState<{ name?: string; amount?: string }>({});

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = parseAmount(amount);
    const next = {
      name: name.trim() ? undefined : 'Bitte einen Namen eingeben.',
      amount:
        parsed === null
          ? 'Bitte einen gültigen Betrag eingeben, z. B. 6500 oder 6500.50.'
          : undefined,
    };
    setErrors(next);
    if (next.name || next.amount || parsed === null) return;
    onSubmit({ id: initial?.id, name: name.trim(), amount: parsed, interval });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Field label="Bezeichnung" error={errors.name}>
        {(p) => (
          <input
            {...p}
            className={inputClass}
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
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
        {onDelete ? <ConfirmDeleteButton onConfirm={onDelete} /> : <span />}
        <button type="submit" className={buttonClass('primary')}>
          Speichern
        </button>
      </div>
    </form>
  );
}
