import { Link } from 'react-router-dom';
import type { BudgetSummary } from '../lib/budget';
import { formatCHF } from '../lib/money';
import { Card } from './Card';

interface BudgetCardProps {
  summary: BudgetSummary;
  monthLabel: string;
}

export function BudgetCard({ summary, monthLabel }: BudgetCardProps) {
  const { income, fixed, available, spent, free, spentRatio } = summary;
  const overBudget = free < 0;
  const percent = Math.round(spentRatio * 100);

  return (
    <Card title={`Frei verfügbar · ${monthLabel}`}>
      {income === 0 ? (
        <div className="space-y-3">
          <p className="text-slate-600 dark:text-slate-400">
            Erfasse dein Einkommen und deine Fixkosten, um zu sehen, wie viel dir diesen Monat
            wirklich bleibt.
          </p>
          <Link
            to="/fixkosten"
            className="inline-flex min-h-11 items-center rounded-xl bg-brand-700 px-4 font-semibold text-white hover:bg-brand-800"
          >
            Einkommen erfassen
          </Link>
        </div>
      ) : (
        <>
          <p
            className={`text-4xl font-bold tracking-tight ${overBudget ? 'text-red-600 dark:text-red-400' : ''}`}
            data-testid="free-budget"
          >
            {formatCHF(free)}
          </p>
          {overBudget && (
            <p className="mt-1 text-sm font-medium text-red-600 dark:text-red-400">
              Budget überschritten
            </p>
          )}

          <div
            role="progressbar"
            aria-label="Anteil bereits ausgegeben"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
          >
            <div
              className={`h-full rounded-full transition-[width] ${
                overBudget ? 'bg-red-500' : spentRatio > 0.8 ? 'bg-amber-500' : 'bg-brand-600'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-sm text-slate-600 dark:text-slate-400">
            <span>Ausgegeben {formatCHF(spent)}</span>
            <span>von {formatCHF(available)}</span>
          </div>

          <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Einkommen</dt>
              <dd className="font-semibold">{formatCHF(income)}</dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Fixkosten</dt>
              <dd className="font-semibold">{formatCHF(fixed)}</dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Variabel</dt>
              <dd className="font-semibold">{formatCHF(spent)}</dd>
            </div>
          </dl>
        </>
      )}
    </Card>
  );
}
