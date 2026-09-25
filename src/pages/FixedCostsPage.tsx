import { useState } from 'react';
import { BottomSheet } from '../components/BottomSheet';
import { Card } from '../components/Card';
import { buttonClass, inputClass } from '../components/styles';
import { Icon } from '../components/Icon';
import { IncomeForm } from '../components/IncomeForm';
import { PageHeader } from '../components/PageHeader';
import { RecurringExpenseForm } from '../components/RecurringExpenseForm';
import {
  SETTING_REMINDER_LEAD_DAYS,
  useCategories,
  useCategoryMap,
  useIncomes,
  useRecurringExpenses,
  useSetting,
} from '../db/hooks';
import { deleteIncome, deleteRecurringExpense, saveIncome, saveRecurringExpense } from '../db/repo';
import {
  RECURRING_SORT_LABELS,
  effectiveDueDate,
  sortRecurring,
  sumMonthly,
  sumYearly,
  type RecurringSortKey,
} from '../lib/budget';
import { DEFAULT_REMINDER_LEAD_DAYS } from '../lib/contracts';
import { formatDate, todayISO } from '../lib/date';
import { INTERVAL_LABELS, monthlyEquivalent } from '../lib/interval';
import { formatCHF } from '../lib/money';
import type { Income, RecurringExpense } from '../types';

type Editing =
  { type: 'income'; item?: Income } | { type: 'recurring'; item?: RecurringExpense } | null;

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={buttonClass('ghost', 'px-3')}>
      <Icon name="plus" className="size-5" />
      {label}
    </button>
  );
}

export function FixedCostsPage() {
  const incomes = useIncomes();
  const recurring = useRecurringExpenses();
  const fixedCategories = useCategories('fixed');
  const categoryMap = useCategoryMap();
  const reminderLeadDays = useSetting(SETTING_REMINDER_LEAD_DAYS, DEFAULT_REMINDER_LEAD_DAYS);
  const [sortKey, setSortKey] = useState<RecurringSortKey>('amount');
  const [editing, setEditing] = useState<Editing>(null);

  const today = todayISO();
  const active = (recurring ?? []).filter((r) => r.active);
  const sorted = sortRecurring(recurring ?? [], sortKey, today);
  const close = () => setEditing(null);

  return (
    <>
      <PageHeader title="Fixkosten" />
      <div className="space-y-4">
        <Card>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-slate-500 dark:text-slate-400">Pro Monat</dt>
              <dd className="whitespace-nowrap text-xl font-bold sm:text-2xl">
                {formatCHF(sumMonthly(active))}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500 dark:text-slate-400">Pro Jahr</dt>
              <dd className="whitespace-nowrap text-xl font-bold sm:text-2xl">
                {formatCHF(sumYearly(active))}
              </dd>
            </div>
          </dl>
        </Card>

        <section aria-labelledby="fixkosten-heading" className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 id="fixkosten-heading" className="text-lg font-semibold">
              Wiederkehrende Kosten
            </h2>
            <AddButton label="Hinzufügen" onClick={() => setEditing({ type: 'recurring' })} />
          </div>
          {sorted.length > 1 && (
            <div className="flex items-center gap-2">
              <label
                htmlFor="sort"
                className="whitespace-nowrap text-sm text-slate-600 dark:text-slate-400"
              >
                Sortieren nach
              </label>
              <select
                id="sort"
                className={`${inputClass} w-auto`}
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as RecurringSortKey)}
              >
                {Object.entries(RECURRING_SORT_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <Card className="p-0">
            {sorted.length === 0 ? (
              <p className="p-4 text-slate-500 dark:text-slate-400">
                Noch keine Fixkosten erfasst. Typische Posten sind Miete, Krankenkasse, Handy-Abo
                oder Serafe.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {sorted.map((r) => {
                  const category = categoryMap.get(r.categoryId);
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => setEditing({ type: 'recurring', item: r })}
                        className={`flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 ${r.active ? '' : 'opacity-60'}`}
                      >
                        <span
                          aria-hidden="true"
                          className="flex size-10 shrink-0 items-center justify-center rounded-full text-lg"
                          style={{ backgroundColor: `${category?.color ?? '#64748b'}22` }}
                        >
                          {r.icon ?? category?.icon ?? '📄'}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{r.name}</span>
                          <span className="block text-sm text-slate-500 dark:text-slate-400">
                            {r.active
                              ? `${INTERVAL_LABELS[r.interval]} · ${formatDate(effectiveDueDate(r, today))}`
                              : `${INTERVAL_LABELS[r.interval]} · pausiert`}
                          </span>
                        </span>
                        <span className="shrink-0 whitespace-nowrap text-right">
                          <span className="block font-semibold">
                            {formatCHF(monthlyEquivalent(r.amount, r.interval))}
                          </span>
                          <span className="block text-xs text-slate-500 dark:text-slate-400">
                            {r.interval === 'monthly'
                              ? 'pro Monat'
                              : `${formatCHF(r.amount)} ${INTERVAL_LABELS[r.interval].toLowerCase()}`}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </section>

        <section aria-labelledby="einkommen-heading" className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 id="einkommen-heading" className="text-lg font-semibold">
              Einkommen
            </h2>
            <AddButton label="Hinzufügen" onClick={() => setEditing({ type: 'income' })} />
          </div>
          <Card className="p-0">
            {(incomes ?? []).length === 0 ? (
              <p className="p-4 text-slate-500 dark:text-slate-400">Noch kein Einkommen erfasst.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {incomes!.map((i) => (
                  <li key={i.id}>
                    <button
                      type="button"
                      onClick={() => setEditing({ type: 'income', item: i })}
                      className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <span>
                        <span className="block font-medium">{i.name}</span>
                        <span className="block text-sm text-slate-500 dark:text-slate-400">
                          {formatCHF(i.amount)} {INTERVAL_LABELS[i.interval].toLowerCase()}
                        </span>
                      </span>
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        {formatCHF(monthlyEquivalent(i.amount, i.interval))}
                      </span>
                    </button>
                  </li>
                ))}
                <li className="flex justify-between px-4 py-3 text-sm font-semibold">
                  <span>Total pro Monat</span>
                  <span>{formatCHF(sumMonthly(incomes!))}</span>
                </li>
              </ul>
            )}
          </Card>
        </section>
      </div>

      <BottomSheet
        open={editing?.type === 'recurring'}
        title={editing?.item ? 'Fixkosten bearbeiten' : 'Fixkosten erfassen'}
        onClose={close}
      >
        {editing?.type === 'recurring' && fixedCategories && (
          <RecurringExpenseForm
            key={editing.item?.id ?? 'new'}
            initial={editing.item}
            categories={fixedCategories}
            defaultReminderLeadDays={reminderLeadDays}
            onSubmit={async (draft) => {
              await saveRecurringExpense(draft);
              close();
            }}
            onDelete={
              editing.item
                ? async () => {
                    await deleteRecurringExpense(editing.item!.id);
                    close();
                  }
                : undefined
            }
          />
        )}
      </BottomSheet>

      <BottomSheet
        open={editing?.type === 'income'}
        title={editing?.item ? 'Einkommen bearbeiten' : 'Einkommen erfassen'}
        onClose={close}
      >
        {editing?.type === 'income' && (
          <IncomeForm
            key={editing.item?.id ?? 'new'}
            initial={editing.item}
            onSubmit={async (draft) => {
              await saveIncome(draft);
              close();
            }}
            onDelete={
              editing.item
                ? async () => {
                    await deleteIncome(editing.item!.id);
                    close();
                  }
                : undefined
            }
          />
        )}
      </BottomSheet>
    </>
  );
}
