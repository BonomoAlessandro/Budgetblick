import { formatCHF } from '../lib/money';
import type { Category, Expense } from '../types';

interface ExpenseRowProps {
  expense: Expense;
  category?: Category;
  /** Zusatzzeile, z. B. das Datum */
  meta?: string;
  onClick?: () => void;
}

export function ExpenseRow({ expense, category, meta, onClick }: ExpenseRowProps) {
  const title = expense.merchant || category?.name || 'Ausgabe';
  const details = [expense.merchant ? category?.name : undefined, expense.note, meta]
    .filter(Boolean)
    .join(' · ');

  const content = (
    <>
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-full text-lg"
        style={{ backgroundColor: `${category?.color ?? '#64748b'}22` }}
      >
        {category?.icon ?? '❔'}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        {details && (
          <span className="block truncate text-sm text-slate-500 dark:text-slate-400">
            {details}
          </span>
        )}
      </span>
      {expense.receiptImage && (
        <span aria-label="mit Quittung" title="mit Quittung" className="text-sm">
          🧾
        </span>
      )}
      <span className="shrink-0 whitespace-nowrap font-semibold">{formatCHF(expense.amount)}</span>
    </>
  );

  const className = 'flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left';
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={`${className} hover:bg-slate-50 dark:hover:bg-slate-800/50`}
    >
      {content}
    </button>
  ) : (
    <div className={className}>{content}</div>
  );
}
