import type { Category } from '../types';
import { categoryListClass } from './styles';

export interface CategoryListProps {
  categories: Category[];
  onEdit: (category: Category) => void;
}

const listClass = categoryListClass;

/** Antippen öffnet die Bearbeitung. */
export function EditButton({ category: c, onEdit }: { category: Category; onEdit: () => void }) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="flex min-h-12 min-w-0 flex-1 items-center gap-3 py-2 pl-4 pr-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50"
    >
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-lg"
        style={{ backgroundColor: `${c.color}22` }}
      >
        {c.icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{c.name}</span>
      <span
        aria-hidden="true"
        className="size-3 shrink-0 rounded-full"
        style={{ backgroundColor: c.color }}
      />
    </button>
  );
}

export function CategoryList({ categories, onEdit }: CategoryListProps) {
  return (
    <ul className={listClass}>
      {categories.map((c) => (
        <li key={c.id} className="flex">
          <EditButton category={c} onEdit={() => onEdit(c)} />
        </li>
      ))}
    </ul>
  );
}
