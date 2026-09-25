import { Link } from 'react-router-dom';
import { formatRelativeDay } from '../lib/date';
import type { Category, Expense } from '../types';
import { Card } from './Card';
import { ExpenseRow } from './ExpenseRow';

interface RecentExpensesCardProps {
  expenses: Expense[];
  categoryMap: Map<string, Category>;
  today: string;
}

export function RecentExpensesCard({ expenses, categoryMap, today }: RecentExpensesCardProps) {
  return (
    <Card title="Letzte Ausgaben" className="pb-2">
      {expenses.length === 0 ? (
        <p className="pb-2 text-slate-500 dark:text-slate-400">
          Noch keine Ausgaben. Tippe auf „+", um die erste zu erfassen.
        </p>
      ) : (
        <>
          <ul className="-mx-4 divide-y divide-slate-100 dark:divide-slate-800">
            {expenses.map((e) => (
              <li key={e.id}>
                <ExpenseRow
                  expense={e}
                  category={categoryMap.get(e.categoryId)}
                  meta={formatRelativeDay(e.date, today)}
                />
              </li>
            ))}
          </ul>
          <Link
            to="/ausgaben"
            className="mt-1 flex min-h-11 items-center justify-center rounded-xl font-medium text-brand-700 hover:bg-brand-50 dark:text-brand-500 dark:hover:bg-slate-800"
          >
            Alle Ausgaben
          </Link>
        </>
      )}
    </Card>
  );
}
