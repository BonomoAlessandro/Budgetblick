import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';

export function ExpensesPage() {
  return (
    <>
      <PageHeader title="Ausgaben" />
      <Card>
        <p className="text-slate-500 dark:text-slate-400">
          Noch keine Ausgaben. Tippe auf „+", um eine Ausgabe zu erfassen.
        </p>
      </Card>
    </>
  );
}
