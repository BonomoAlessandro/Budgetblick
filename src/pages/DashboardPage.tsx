import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { formatMonth } from '../lib/date';

export function DashboardPage() {
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
      <div className="space-y-4">
        <Card title={`Frei verfügbar · ${formatMonth(new Date())}`}>
          <p className="text-slate-500 dark:text-slate-400">
            Erfasse Einkommen und Fixkosten, um dein freies Budget zu sehen.
          </p>
        </Card>
      </div>
    </>
  );
}
