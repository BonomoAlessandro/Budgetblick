import { beforeEach, describe, expect, it } from 'vitest';
import { BACKUP_FORMAT } from '../lib/backup';
import { resetDb } from '../test/utils';
import { createBackup, deleteAllData, restoreBackup } from './backup';
import { db } from './db';

beforeEach(resetDb);

async function seed() {
  await db.incomes.add({ id: 'i', name: 'Lohn', amount: 650000, interval: 'monthly' });
  await db.recurringExpenses.add({
    id: 'r',
    name: 'Miete',
    amount: 180000,
    interval: 'monthly',
    nextDueDate: '2026-10-01',
    categoryId: 'fix-wohnen',
    active: true,
  });
  await db.expenses.add({
    id: 'e',
    amount: 1250,
    date: '2026-09-25',
    categoryId: 'var-lebensmittel',
    source: 'manual',
  });
  await db.settings.put({ key: 'reminderLeadDays', value: 21 });
}

describe('Sicherung', () => {
  it('exportiert alle Tabellen und stellt sie wieder her', async () => {
    await seed();
    const backup = JSON.parse(JSON.stringify(await createBackup(new Date('2026-09-25T10:00:00Z'))));
    expect(backup.format).toBe(BACKUP_FORMAT);
    expect(backup.exportedAt).toBe('2026-09-25T10:00:00.000Z');
    expect(backup.data.categories).toHaveLength(14);

    await deleteAllData();
    expect(await db.incomes.count()).toBe(0);

    await restoreBackup(backup);
    expect(await db.incomes.get('i')).toMatchObject({ amount: 650000 });
    expect(await db.recurringExpenses.get('r')).toMatchObject({ name: 'Miete' });
    expect(await db.expenses.get('e')).toMatchObject({ amount: 1250 });
    expect(await db.settings.get('reminderLeadDays')).toEqual({
      key: 'reminderLeadDays',
      value: 21,
    });
    expect(await db.categories.count()).toBe(14);
  });

  it('lässt die Daten bei einer ungültigen Datei unverändert', async () => {
    await seed();
    await expect(restoreBackup({ format: 'andere-app' })).rejects.toThrow();
    await expect(
      restoreBackup({ format: BACKUP_FORMAT, version: 1, data: { categories: 'kaputt' } }),
    ).rejects.toThrow();
    expect(await db.incomes.count()).toBe(1);
    expect(await db.expenses.count()).toBe(1);
  });
});

describe('deleteAllData', () => {
  it('löscht alles und legt die Standardkategorien neu an', async () => {
    await seed();
    await db.categories.add({
      id: 'eigene',
      name: 'Eigene',
      icon: '⭐',
      color: '#000',
      kind: 'variable',
    });
    await deleteAllData();
    expect(await db.incomes.count()).toBe(0);
    expect(await db.recurringExpenses.count()).toBe(0);
    expect(await db.expenses.count()).toBe(0);
    expect(await db.settings.count()).toBe(0);
    expect(await db.categories.count()).toBe(14);
    expect(await db.categories.get('eigene')).toBeUndefined();
  });
});
