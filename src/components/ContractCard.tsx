import { useState } from 'react';
import type { ContractEntry } from '../lib/contracts';
import { formatDate, formatDaysFromToday } from '../lib/date';
import { formatCHF } from '../lib/money';
import type { Category } from '../types';
import { StatusBadge } from './StatusBadge';
import { buttonClass } from './styles';

interface ContractCardProps {
  entry: ContractEntry;
  category?: Category;
  today: string;
  onMarkCancelled: () => void;
  onUndoCancel: () => void;
  onExportReminder: () => void;
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

export function ContractCard({
  entry,
  category,
  today,
  onMarkCancelled,
  onUndoCancel,
  onExportReminder,
}: ContractCardProps) {
  const { expense, state } = entry;
  const { contract } = expense;
  const [confirmCancel, setConfirmCancel] = useState(false);
  const cancelled = state.status === 'gekuendigt' || state.status === 'beendet';

  return (
    <article
      aria-label={expense.name}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <header className="flex items-start gap-3">
        <span aria-hidden="true" className="text-2xl">
          {expense.icon ?? category?.icon ?? '📄'}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold">{expense.name}</h2>
          <p className="truncate text-sm text-slate-500 dark:text-slate-400">
            {[contract.provider, formatCHF(expense.amount)].filter(Boolean).join(' · ')}
          </p>
        </div>
        <StatusBadge status={state.status} />
      </header>

      <dl className="mt-3 grid grid-cols-2 gap-3">
        <Detail label={cancelled ? 'Läuft bis' : 'Vertragsende'}>
          {formatDate(state.contractEnd)}
        </Detail>
        <Detail label={cancelled ? 'Gekündigt am' : 'Letzter Kündigungstermin'}>
          {cancelled ? (
            formatDate(contract.cancelledOn!)
          ) : (
            <>
              {formatDate(state.lastCancellationDate)}
              <span className="block text-sm font-normal text-slate-500 dark:text-slate-400">
                {formatDaysFromToday(state.lastCancellationDate, today)}
              </span>
            </>
          )}
        </Detail>
      </dl>

      {state.status === 'verpasst' && (
        <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
          Frist verpasst: Der Vertrag verlängert sich bis {formatDate(state.nextContractEnd!)}.
          Nächste Möglichkeit: kündigen bis{' '}
          <strong>{formatDate(state.nextCancellationDate!)}</strong>.
        </p>
      )}
      {state.flexible && !cancelled && (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Monatlich kündbar – ohne Kündigung verlängert sich der Vertrag jeweils um einen Monat.
        </p>
      )}
      {state.status === 'beendet' && (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Vertrag beendet – der Posten zählt nicht mehr zu den Fixkosten.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {!cancelled && (
          <button
            type="button"
            className={buttonClass('secondary', 'text-sm')}
            onClick={onExportReminder}
          >
            📅 Erinnerung in Kalender
          </button>
        )}
        {!cancelled &&
          (confirmCancel ? (
            <>
              <button
                type="button"
                className={buttonClass('primary', 'text-sm')}
                onClick={() => {
                  setConfirmCancel(false);
                  onMarkCancelled();
                }}
              >
                Heute gekündigt
              </button>
              <button
                type="button"
                className={buttonClass('ghost', 'text-sm')}
                onClick={() => setConfirmCancel(false)}
              >
                Abbrechen
              </button>
            </>
          ) : (
            <button
              type="button"
              className={buttonClass('secondary', 'text-sm')}
              onClick={() => setConfirmCancel(true)}
            >
              Als gekündigt markieren
            </button>
          ))}
        {state.status === 'gekuendigt' && (
          <button type="button" className={buttonClass('ghost', 'text-sm')} onClick={onUndoCancel}>
            Kündigung zurücknehmen
          </button>
        )}
      </div>
    </article>
  );
}
