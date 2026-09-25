import { Link } from 'react-router-dom';
import type { ContractEntry } from '../lib/contracts';
import { formatDate, formatDaysFromToday } from '../lib/date';
import { Card } from './Card';
import { StatusBadge } from './StatusBadge';

interface DeadlinesCardProps {
  entries: ContractEntry[];
  today: string;
}

const ROW_ACCENT: Partial<Record<ContractEntry['state']['status'], string>> = {
  bald: 'border-l-amber-500',
  dringend: 'border-l-red-600',
  verpasst: 'border-l-rose-800 dark:border-l-rose-400',
};

/** Verträge mit Handlungsbedarf (bald, dringend, verpasst). */
export function DeadlinesCard({ entries, today }: DeadlinesCardProps) {
  return (
    <Card title="Fristen">
      <ul className="space-y-2">
        {entries.map(({ expense, state }) => (
          <li key={expense.id}>
            <Link
              to="/vertraege"
              className={`flex min-h-12 items-center gap-3 rounded-lg border-l-4 bg-slate-50 py-2 pl-3 pr-2 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 ${ROW_ACCENT[state.status] ?? ''}`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{expense.name}</span>
                <span className="block text-sm text-slate-600 dark:text-slate-400">
                  {state.status === 'verpasst'
                    ? `Verlängert bis ${formatDate(state.nextContractEnd!)}`
                    : `Kündigen bis ${formatDate(state.lastCancellationDate)} · ${formatDaysFromToday(state.lastCancellationDate, today)}`}
                </span>
              </span>
              <StatusBadge status={state.status} />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
