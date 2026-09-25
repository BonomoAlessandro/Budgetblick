import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { ContractCard } from '../components/ContractCard';
import { PageHeader } from '../components/PageHeader';
import { StatusDot } from '../components/StatusBadge';
import { useCategoryMap, useRecurringExpenses } from '../db/hooks';
import { setContractCancelled } from '../db/repo';
import { contractTimeline, type ContractEntry } from '../lib/contracts';
import { todayISO } from '../lib/date';
import { downloadTextFile } from '../lib/download';
import { contractReminderIcs, icsFileName } from '../lib/ics';

function exportReminder({ expense, state }: ContractEntry, today: string) {
  if (!state.reminderDate || !state.nextCancellationDate || !state.nextContractEnd) return;
  const ics = contractReminderIcs(
    {
      expenseId: expense.id,
      name: expense.name,
      provider: expense.contract.provider,
      reminderDate: state.reminderDate,
      cancellationDate: state.nextCancellationDate,
      contractEnd: state.nextContractEnd,
    },
    today,
  );
  downloadTextFile(ics, icsFileName(expense.name), 'text/calendar;charset=utf-8');
}

export function ContractsPage() {
  const recurring = useRecurringExpenses();
  const categoryMap = useCategoryMap();
  const today = todayISO();

  if (!recurring) return <PageHeader title="Verträge" />;
  const entries = contractTimeline(recurring, today);

  return (
    <>
      <PageHeader title="Verträge" />
      {entries.length === 0 ? (
        <Card>
          <p className="text-slate-500 dark:text-slate-400">
            Noch keine Verträge. Vertragsdetails wie Laufzeit und Kündigungsfrist erfasst du bei den{' '}
            <Link
              to="/fixkosten"
              className="font-medium text-brand-700 underline dark:text-brand-500"
            >
              Fixkosten
            </Link>
            .
          </p>
        </Card>
      ) : (
        <ol aria-label="Zeitleiste nach Kündigungstermin" className="relative space-y-4">
          {/* Vertikale Linie der Zeitleiste */}
          <span
            aria-hidden="true"
            className="absolute bottom-4 left-[7px] top-4 w-0.5 bg-slate-200 dark:bg-slate-800"
          />
          {entries.map((entry) => (
            <li key={entry.expense.id} className="relative pl-7">
              <StatusDot
                status={entry.state.status}
                className="absolute left-0 top-5 size-4 rounded-full ring-4 ring-slate-50 dark:ring-slate-950"
              />
              <ContractCard
                entry={entry}
                category={categoryMap.get(entry.expense.categoryId)}
                today={today}
                onMarkCancelled={() => void setContractCancelled(entry.expense.id, today)}
                onUndoCancel={() => void setContractCancelled(entry.expense.id, undefined)}
                onExportReminder={() => exportReminder(entry, today)}
              />
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
