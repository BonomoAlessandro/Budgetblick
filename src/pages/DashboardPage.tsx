import { endOfMonth, startOfMonth } from 'date-fns';
import { Link } from 'react-router-dom';
import { BudgetCard } from '../components/BudgetCard';
import { DeadlinesCard } from '../components/DeadlinesCard';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { RecentExpensesCard } from '../components/RecentExpensesCard';
import { UpcomingCard } from '../components/UpcomingCard';
import {
  useCategoryMap,
  useExpensesBetween,
  useIncomes,
  useRecentExpenses,
  useRecurringExpenses,
} from '../db/hooks';
import { computeBudget, upcomingPayments } from '../lib/budget';
import { contractTimeline, needsAttention } from '../lib/contracts';
import { formatMonth, toISODate, todayISO } from '../lib/date';
import { latestExpenses } from '../lib/expenses';

export function DashboardPage() {
  const now = new Date();
  const today = todayISO(now);
  const incomes = useIncomes();
  const recurring = useRecurringExpenses();
  const expenses = useExpensesBetween(toISODate(startOfMonth(now)), toISODate(endOfMonth(now)));
  // Etwas mehr laden, damit gleiche Tage korrekt nach Erfassungszeit sortiert werden.
  const recent = useRecentExpenses(20);
  const categoryMap = useCategoryMap();

  const loaded = incomes && recurring && expenses && recent;
  const deadlines = recurring
    ? contractTimeline(recurring, today).filter((e) => e.expense.active && needsAttention(e.state))
    : [];

  return (
    <>
      <PageHeader
        title="Budgetblick"
        action={
          <Link
            to="/einstellungen"
            aria-label="Einstellungen"
            className="flex size-11 items-center justify-center rounded-full text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Icon name="settings" />
          </Link>
        }
      />
      {loaded && (
        <div className="space-y-4">
          <BudgetCard
            summary={computeBudget({ incomes, recurring, expenses, month: now })}
            monthLabel={formatMonth(now)}
          />
          {deadlines.length > 0 && <DeadlinesCard entries={deadlines} today={today} />}
          <UpcomingCard
            payments={upcomingPayments(recurring, today, 5)}
            categoryMap={categoryMap}
            today={today}
          />
          <RecentExpensesCard
            expenses={latestExpenses(recent, 5)}
            categoryMap={categoryMap}
            today={today}
          />
        </div>
      )}
    </>
  );
}
