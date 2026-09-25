import { afterEach, describe, expect, it } from 'vitest';
import { BudgetDB } from './db';
import { DEFAULT_CATEGORIES } from './defaultCategories';

describe('BudgetDB', () => {
  let testDb: BudgetDB;

  afterEach(async () => {
    await testDb.delete();
  });

  it('legt beim ersten Start die Standardkategorien an', async () => {
    testDb = new BudgetDB('test-seed');
    const categories = await testDb.categories.toArray();
    expect(categories).toHaveLength(16);
    expect(await testDb.categories.where('kind').equals('fixed').count()).toBe(8);
    expect(await testDb.categories.where('kind').equals('variable').count()).toBe(8);
    expect(categories.map((c) => c.name)).toContain('Serafe & Gebühren');
  });

  it('legt Standardkategorien nicht erneut an, wenn sie gelöscht wurden', async () => {
    testDb = new BudgetDB('test-reopen');
    await testDb.categories.delete(DEFAULT_CATEGORIES[0]!.id);
    testDb.close();
    await testDb.open();
    expect(await testDb.categories.count()).toBe(15);
  });

  it('speichert und lädt Ausgaben', async () => {
    testDb = new BudgetDB('test-expense');
    await testDb.expenses.add({
      id: 'e1',
      amount: 1250,
      date: '2026-09-25',
      categoryId: 'var-lebensmittel',
      source: 'manual',
    });
    const inSeptember = await testDb.expenses
      .where('date')
      .between('2026-09-01', '2026-09-30', true, true)
      .toArray();
    expect(inSeptember).toHaveLength(1);
    expect(inSeptember[0]!.amount).toBe(1250);
  });

  it('hat eindeutige IDs für alle Standardkategorien', () => {
    const ids = new Set(DEFAULT_CATEGORIES.map((c) => c.id));
    expect(ids.size).toBe(DEFAULT_CATEGORIES.length);
  });
});
