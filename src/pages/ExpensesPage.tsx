import { addMonths, endOfMonth, isSameMonth, startOfMonth } from 'date-fns';
import { lazy, Suspense, useState } from 'react';
import { BottomSheet } from '../components/BottomSheet';
import { Card } from '../components/Card';
import { ExpenseForm } from '../components/ExpenseForm';
import { ExpenseRow } from '../components/ExpenseRow';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { inputClass } from '../components/styles';
import { useCategories, useCategoryMap, useExpensesBetween } from '../db/hooks';
import { deleteExpense, saveExpense } from '../db/repo';
import { formatDateLong, formatMonth, toISODate } from '../lib/date';
import { groupByDay, sumByCategory } from '../lib/expenses';
import { formatCHF } from '../lib/money';
import type { Expense } from '../types';

// Recharts ist gross: erst laden, wenn das Diagramm gebraucht wird.
const CategoryDonut = lazy(() =>
  import('../components/CategoryDonut').then((m) => ({ default: m.CategoryDonut })),
);

const ALL = '';

export function ExpensesPage() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const [editing, setEditing] = useState<Expense | null>(null);

  const expenses = useExpensesBetween(toISODate(month), toISODate(endOfMonth(month)));
  const variableCategories = useCategories('variable');
  const categoryMap = useCategoryMap();

  const isCurrentMonth = isSameMonth(month, new Date());
  const all = expenses ?? [];
  const total = all.reduce((s, e) => s + e.amount, 0);
  const slices = sumByCategory(all, variableCategories ?? []);
  const filtered = categoryFilter ? all.filter((e) => e.categoryId === categoryFilter) : all;
  const days = groupByDay(filtered);

  const monthNavClass =
    'flex size-11 items-center justify-center rounded-full text-slate-600 hover:bg-slate-200 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800';

  return (
    <>
      <PageHeader title="Ausgaben" />
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            className={monthNavClass}
            aria-label="Vorheriger Monat"
            onClick={() => setMonth((m) => addMonths(m, -1))}
          >
            <Icon name="back" />
          </button>
          <h2 className="text-lg font-semibold" aria-live="polite">
            {formatMonth(month)}
          </h2>
          <button
            type="button"
            className={monthNavClass}
            aria-label="Nächster Monat"
            disabled={isCurrentMonth}
            onClick={() => setMonth((m) => addMonths(m, 1))}
          >
            <Icon name="back" className="size-6 rotate-180" />
          </button>
        </div>

        {expenses && all.length > 0 && (
          <Card title="Nach Kategorie">
            <Suspense fallback={<div className="h-44" aria-hidden="true" />}>
              <CategoryDonut
                slices={slices}
                total={total}
                selectedId={categoryFilter || undefined}
                onSelect={(id) => setCategoryFilter((current) => (current === id ? ALL : id))}
              />
            </Suspense>
          </Card>
        )}

        <div className="flex items-center gap-2">
          <label
            htmlFor="category-filter"
            className="whitespace-nowrap text-sm text-slate-600 dark:text-slate-400"
          >
            Kategorie
          </label>
          <select
            id="category-filter"
            className={inputClass}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value={ALL}>Alle Kategorien</option>
            {(variableCategories ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>

        {expenses && days.length === 0 && (
          <Card>
            <p className="text-slate-500 dark:text-slate-400">
              {all.length === 0
                ? 'Keine Ausgaben in diesem Monat. Tippe auf „+", um eine Ausgabe zu erfassen.'
                : 'Keine Ausgaben in dieser Kategorie.'}
            </p>
          </Card>
        )}

        {days.map((day) => (
          <section key={day.date} aria-labelledby={`day-${day.date}`}>
            <div className="mb-1 flex items-baseline justify-between px-1">
              <h3
                id={`day-${day.date}`}
                className="text-sm font-semibold text-slate-600 dark:text-slate-400"
              >
                {formatDateLong(day.date)}
              </h3>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {formatCHF(day.total)}
              </span>
            </div>
            <Card className="p-0">
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {day.expenses.map((e) => (
                  <li key={e.id}>
                    <ExpenseRow
                      expense={e}
                      category={categoryMap.get(e.categoryId)}
                      onClick={() => setEditing(e)}
                    />
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        ))}
      </div>

      <BottomSheet
        open={editing !== null}
        title="Ausgabe bearbeiten"
        onClose={() => setEditing(null)}
      >
        {editing && variableCategories && (
          <ExpenseForm
            key={editing.id}
            initial={editing}
            categories={variableCategories}
            onSubmit={async (draft) => {
              await saveExpense(draft);
              setEditing(null);
            }}
            onDelete={async () => {
              await deleteExpense(editing.id);
              setEditing(null);
            }}
          />
        )}
      </BottomSheet>
    </>
  );
}
