import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';

export function FixedCostsPage() {
  return (
    <>
      <PageHeader title="Fixkosten" />
      <Card>
        <p className="text-slate-500 dark:text-slate-400">Noch keine Fixkosten erfasst.</p>
      </Card>
    </>
  );
}
