import Dexie from 'dexie';
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
    expect(categories).toHaveLength(14);
    expect(await testDb.categories.where('kind').equals('fixed').count()).toBe(7);
    expect(await testDb.categories.where('kind').equals('variable').count()).toBe(7);
    expect(categories.map((c) => c.name)).toContain('Serafe & Gebühren');
    expect(categories.map((c) => c.name)).toContain('Reisen');
    expect(categories.map((c) => c.name)).not.toContain('Versicherungen');
  });

  it('legt Standardkategorien nicht erneut an, wenn sie gelöscht wurden', async () => {
    testDb = new BudgetDB('test-reopen');
    await testDb.categories.delete(DEFAULT_CATEGORIES[0]!.id);
    testDb.close();
    await testDb.open();
    expect(await testDb.categories.count()).toBe(13);
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

  it('entfernt bei bestehenden Daten nur unbenutzte alte Standardkategorien und ergänzt Reisen', async () => {
    // Datenbank im Stand vor Version 3 anlegen
    const name = 'test-migration-v3';
    const old = new Dexie(name);
    old.version(2).stores({
      categories: 'id, kind, name',
      incomes: 'id, name',
      recurringExpenses: 'id, categoryId, nextDueDate, name',
      expenses: 'id, date, categoryId',
      settings: 'key',
      products: 'code',
    });
    await old.table('categories').bulkAdd([
      { id: 'fix-wohnen', name: 'Wohnen', icon: '🏠', color: '#0f766e', kind: 'fixed' },
      {
        id: 'fix-versicherungen',
        name: 'Versicherungen',
        icon: '🛡️',
        color: '#2563eb',
        kind: 'fixed',
      },
      { id: 'var-gesundheit', name: 'Gesundheit', icon: '💊', color: '#e87ba4', kind: 'variable' },
      // umbenannt: gehört jetzt dem Nutzer, bleibt
      {
        id: 'var-geschenke',
        name: 'Geschenke & Spenden',
        icon: '🎁',
        color: '#4a3aa7',
        kind: 'variable',
      },
    ]);
    // Gesundheit wird verwendet und muss bleiben
    await old.table('expenses').add({
      id: 'e1',
      amount: 1990,
      date: '2026-09-20',
      categoryId: 'var-gesundheit',
      source: 'manual',
    });
    old.close();

    testDb = new BudgetDB(name);
    const ids = (await testDb.categories.toArray()).map((c) => c.id).sort();
    expect(ids).toEqual(['fix-wohnen', 'var-geschenke', 'var-gesundheit', 'var-reisen']);
    expect(await testDb.categories.get('var-reisen')).toMatchObject({
      name: 'Reisen',
      kind: 'variable',
    });
    expect(await testDb.expenses.get('e1')).toMatchObject({ categoryId: 'var-gesundheit' });
  });

  it('hat eindeutige IDs für alle Standardkategorien', () => {
    const ids = new Set(DEFAULT_CATEGORIES.map((c) => c.id));
    expect(ids.size).toBe(DEFAULT_CATEGORIES.length);
  });
});
