import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';

export function ContractsPage() {
  return (
    <>
      <PageHeader title="Verträge" />
      <Card>
        <p className="text-slate-500 dark:text-slate-400">
          Noch keine Verträge. Vertragsdetails erfasst du bei den Fixkosten.
        </p>
      </Card>
    </>
  );
}
