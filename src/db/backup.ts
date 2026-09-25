import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  blobToDataUrl,
  dataUrlToBlob,
  parseBackup,
  type BackupFile,
  type ExportedExpense,
} from '../lib/backup';
import type { Expense } from '../types';
import { db } from './db';
import { DEFAULT_CATEGORIES } from './defaultCategories';

const TABLES = () => [db.categories, db.incomes, db.recurringExpenses, db.expenses, db.settings];

/** Alle Daten als Sicherungsobjekt (Quittungsbilder als Data-URL). */
export async function createBackup(now: Date = new Date()): Promise<BackupFile> {
  const [categories, incomes, recurringExpenses, rawExpenses, settings] = await Promise.all([
    db.categories.toArray(),
    db.incomes.toArray(),
    db.recurringExpenses.toArray(),
    db.expenses.toArray(),
    db.settings.toArray(),
  ]);
  const expenses: ExportedExpense[] = await Promise.all(
    rawExpenses.map(async ({ receiptImage, ...rest }) =>
      receiptImage instanceof Blob
        ? { ...rest, receiptImage: await blobToDataUrl(receiptImage) }
        : rest,
    ),
  );
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    data: { categories, incomes, recurringExpenses, expenses, settings },
  };
}

/**
 * Ersetzt alle Daten durch den Inhalt der Sicherung. Die Datei wird vorher
 * vollständig geprüft; bei einem Fehler bleibt alles unverändert.
 */
export async function restoreBackup(json: unknown): Promise<void> {
  const data = parseBackup(json);
  const expenses: Expense[] = data.expenses.map(({ receiptImage, ...rest }) =>
    receiptImage ? { ...rest, receiptImage: dataUrlToBlob(receiptImage) } : rest,
  );
  await db.transaction('rw', TABLES(), async () => {
    await Promise.all(TABLES().map((t) => t.clear()));
    await db.categories.bulkAdd(data.categories);
    await db.incomes.bulkAdd(data.incomes);
    await db.recurringExpenses.bulkAdd(data.recurringExpenses);
    await db.expenses.bulkAdd(expenses);
    await db.settings.bulkAdd(data.settings);
  });
}

/** Löscht alle Daten und legt die Standardkategorien neu an. */
export async function deleteAllData(): Promise<void> {
  await db.transaction('rw', TABLES(), async () => {
    await Promise.all(TABLES().map((t) => t.clear()));
    await db.categories.bulkAdd(DEFAULT_CATEGORIES);
  });
}
