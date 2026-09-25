import Dexie, { type EntityTable } from 'dexie';
import type { Category, Expense, Income, Product, RecurringExpense, Setting } from '../types';
import { DEFAULT_CATEGORIES } from './defaultCategories';

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
