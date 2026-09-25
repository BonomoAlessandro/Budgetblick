import { describe, expect, it } from 'vitest';
import {
  BACKUP_FORMAT,
  BackupError,
  backupFileName,
  blobToDataUrl,
  dataUrlToBlob,
  parseBackup,
  type BackupData,
} from './backup';

function validData(): BackupData {
  return {
    categories: [{ id: 'c', name: 'Lebensmittel', icon: '🛒', color: '#000000', kind: 'variable' }],
    incomes: [{ id: 'i', name: 'Lohn', amount: 650000, interval: 'monthly' }],
    recurringExpenses: [
      {
        id: 'r',
        name: 'Handy',
        amount: 6500,
        interval: 'monthly',
        nextDueDate: '2026-10-01',
        categoryId: 'fix-telefon',
        active: true,
        contract: {
          startDate: '2025-01-01',
          minTermMonths: 24,
          renewalTermMonths: 12,
          noticePeriod: { value: 3, unit: 'months' },
          reminderLeadDays: 14,
        },
      },
    ],
    expenses: [
      {
        id: 'e',
        amount: 1250,
        date: '2026-09-25',
        categoryId: 'c',
        source: 'scan',
        receiptImage: 'data:image/jpeg;base64,AAEC',
      },
    ],
    settings: [{ key: 'reminderLeadDays', value: 21 }],
    products: [
      {
        code: '9002490100070',
        name: 'Red Bull',
        lastPrice: 195,
        categoryId: 'c',
        merchant: 'Coop',
        updatedAt: 1790000000000,
      },
    ],
  };
}

function file(data: unknown) {
  return { format: BACKUP_FORMAT, version: 2, exportedAt: '2026-09-25T10:00:00.000Z', data };
}

describe('Blob ↔ Data-URL', () => {
  it('wandelt verlustfrei hin und zurück', async () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 255]);
    const url = await blobToDataUrl(new Blob([bytes], { type: 'image/jpeg' }));
    expect(url).toBe('data:image/jpeg;base64,AAEC+v8=');
    const blob = dataUrlToBlob(url);
    expect(blob.type).toBe('image/jpeg');
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(bytes);
  });

  it('verarbeitet grosse Bilder in Blöcken', async () => {
    const bytes = new Uint8Array(200_000).map((_, i) => i % 256);
    const blob = dataUrlToBlob(await blobToDataUrl(new Blob([bytes])));
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(bytes);
  });

  it('lehnt ungültige Data-URLs ab', () => {
    expect(() => dataUrlToBlob('kein-bild')).toThrow(BackupError);
  });
});

describe('parseBackup', () => {
  it('akzeptiert eine gültige Sicherung', () => {
    expect(parseBackup(file(validData()))).toEqual(validData());
  });

  it('liest ältere Sicherungen (Version 1) ohne Produkte', () => {
    const data: Partial<BackupData> = validData();
    delete data.products;
    expect(parseBackup({ ...file(data), version: 1 }).products).toEqual([]);
  });

  it('erkennt fremde Dateien', () => {
    expect(() => parseBackup({ hello: 'world' })).toThrow('keine Budgetblick-Sicherung');
    expect(() => parseBackup([])).toThrow('keine Budgetblick-Sicherung');
  });

  it('lehnt Sicherungen aus neueren Versionen ab', () => {
    expect(() => parseBackup({ ...file(validData()), version: 99 })).toThrow('neueren Version');
  });

  it.each([
    [
      'fehlende Tabelle',
      (d: BackupData) => delete (d as Partial<BackupData>).incomes,
      'data.incomes',
    ],
    ['Betrag als Kommazahl', (d: BackupData) => (d.incomes[0]!.amount = 12.5), 'incomes[0].amount'],
    [
      'ungültiges Datum',
      (d: BackupData) => (d.expenses[0]!.date = '25.09.2026'),
      'expenses[0].date',
    ],
    [
      'ungültiges Intervall',
      (d: BackupData) => ((d.incomes[0] as { interval: string }).interval = 'daily'),
      'incomes[0].interval',
    ],
    [
      'ungültige Kündigungsfrist',
      (d: BackupData) =>
        ((d.recurringExpenses[0]!.contract!.noticePeriod as { unit: string }).unit = 'years'),
      'recurringExpenses[0].contract.noticePeriod.unit',
    ],
    ['doppelte ID', (d: BackupData) => d.categories.push({ ...d.categories[0]! }), 'doppelt'],
    [
      'Produktpreis als Kommazahl',
      (d: BackupData) => (d.products[0]!.lastPrice = 1.95),
      'products[0].lastPrice',
    ],
    [
      'Produkt ohne Artikelnummer',
      (d: BackupData) => (d.products[0]!.code = ''),
      'products[0].code',
    ],
    [
      'doppelte Artikelnummer',
      (d: BackupData) => d.products.push({ ...d.products[0]! }),
      '9002490100070',
    ],
  ])('meldet %s', (_label, mutate, message) => {
    const data = validData();
    mutate(data);
    expect(() => parseBackup(file(data))).toThrow(message);
  });
});

describe('backupFileName', () => {
  it('enthält das Datum', () => {
    expect(backupFileName('2026-09-25')).toBe('budgetblick-sicherung-2026-09-25.json');
  });
});
