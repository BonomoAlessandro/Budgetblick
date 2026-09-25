import Dexie, { type EntityTable } from 'dexie';
import type { Category, Expense, Income, Product, RecurringExpense, Setting } from '../types';
import { DEFAULT_CATEGORIES, RETIRED_DEFAULT_CATEGORIES } from './defaultCategories';

export class BudgetDB extends Dexie {
  categories!: EntityTable<Category, 'id'>;
  incomes!: EntityTable<Income, 'id'>;
  recurringExpenses!: EntityTable<RecurringExpense, 'id'>;
  expenses!: EntityTable<Expense, 'id'>;
  settings!: EntityTable<Setting, 'key'>;
  products!: EntityTable<Product, 'code'>;

  constructor(name = 'budgetblick') {
    super(name);
    this.version(1).stores({
      categories: 'id, kind, name',
      incomes: 'id, name',
      recurringExpenses: 'id, categoryId, nextDueDate, name',
      expenses: 'id, date, categoryId',
      settings: 'key',
    });
    // Gemerkte Produkte für den Barcode-Scan
    this.version(2).stores({ products: 'code' });
    // Standardkategorien überarbeitet: Versicherungen, Gesundheit und Geschenke entfernt,
    // Reisen neu. Läuft nur bei bestehenden Datenbanken (neue erhalten sie per populate).
    this.version(3)
      .stores({})
      .upgrade(async (tx) => {
        const categories = tx.table<Category, string>('categories');
        for (const [id, name] of RETIRED_DEFAULT_CATEGORIES) {
          const category = await categories.get(id);
          // Nur unveränderte und unbenutzte löschen – sonst verlören Einträge ihre Kategorie.
          if (!category || category.name !== name) continue;
          const [expenses, recurring] = await Promise.all([
            tx.table('expenses').where('categoryId').equals(id).count(),
            tx.table('recurringExpenses').where('categoryId').equals(id).count(),
          ]);
          if (expenses + recurring === 0) await categories.delete(id);
        }
        const travel = DEFAULT_CATEGORIES.find((c) => c.id === 'var-reisen');
        if (travel && !(await categories.get(travel.id))) await categories.add(travel);
      });

    // Wird nur beim allerersten Anlegen der Datenbank ausgeführt.
    this.on('populate', (tx) => {
      tx.table('categories').bulkAdd(DEFAULT_CATEGORIES);
    });
  }
}

export const db = new BudgetDB();

export function newId(): string {
  return crypto.randomUUID();
}
