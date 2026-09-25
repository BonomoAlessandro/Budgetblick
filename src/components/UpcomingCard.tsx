import type { UpcomingPayment } from '../lib/budget';
import { formatRelativeDay } from '../lib/date';
import { formatCHF } from '../lib/money';
import type { Category } from '../types';
import { Card } from './Card';

interface UpcomingCardProps {
  payments: UpcomingPayment[];
  categoryMap: Map<string, Category>;
  today: string;
}

export function UpcomingCard({ payments, categoryMap, today }: UpcomingCardProps) {
  return (
    <Card title="Demnächst">
      {payments.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400">Keine anstehenden Abbuchungen.</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {payments.map(({ expense, date }) => {
            const category = categoryMap.get(expense.categoryId);
            return (
              <li key={`${expense.id}-${date}`} className="flex min-h-12 items-center gap-3 py-2">
                <span aria-hidden="true" className="w-8 shrink-0 text-center text-xl">
                  {expense.icon ?? category?.icon ?? '📄'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{expense.name}</span>
                  <span className="block text-sm text-slate-500 dark:text-slate-400">
                    {formatRelativeDay(date, today)}
                  </span>
                </span>
                <span className="shrink-0 whitespace-nowrap font-semibold">
                  {formatCHF(expense.amount)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
