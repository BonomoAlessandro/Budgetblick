import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { db } from '../db/db';
import type { Category } from '../types';

function CategoryList({ categories }: { categories: Category[] }) {
  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {categories.map((c) => (
        <li key={c.id} className="flex min-h-11 items-center gap-3 py-2">
          <span
            aria-hidden="true"
            className="flex size-9 items-center justify-center rounded-full text-lg"
            style={{ backgroundColor: `${c.color}22` }}
          >
            {c.icon}
          </span>
          <span>{c.name}</span>
        </li>
      ))}
    </ul>
  );
}

export function SettingsPage() {
  const categories = useLiveQuery(() => db.categories.orderBy('name').toArray(), []);
  const fixed = categories?.filter((c) => c.kind === 'fixed') ?? [];
  const variable = categories?.filter((c) => c.kind === 'variable') ?? [];

  return (
    <>
      <PageHeader
        title="Einstellungen"
        action={
          <Link
            to="/"
            aria-label="Zurück zur Übersicht"
            className="flex size-11 items-center justify-center rounded-full text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Icon name="back" />
          </Link>
        }
      />
      <div className="space-y-4">
        <Card title="Kategorien · Fixkosten">
          <CategoryList categories={fixed} />
        </Card>
        <Card title="Kategorien · Variabel">
          <CategoryList categories={variable} />
        </Card>
      </div>
    </>
  );
}
