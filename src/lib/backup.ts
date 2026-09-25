import type {
  Category,
  Expense,
  Income,
  Interval,
  Product,
  RecurringExpense,
  Setting,
} from '../types';
import { INTERVALS } from './interval';

export const BACKUP_FORMAT = 'budgetblick-backup';
/** 2: gemerkte Barcode-Produkte (`products`); Version-1-Dateien bleiben lesbar. */
export const BACKUP_VERSION = 2;

/** Ausgabe im Export: Quittungsbild als Data-URL statt Blob. */
export type ExportedExpense = Omit<Expense, 'receiptImage'> & { receiptImage?: string };

export interface BackupData {
  categories: Category[];
  incomes: Income[];
  recurringExpenses: RecurringExpense[];
  expenses: ExportedExpense[];
  settings: Setting[];
  products: Product[];
}

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  data: BackupData;
}

export class BackupError extends Error {}

// --- Blob ↔ Data-URL ---------------------------------------------------------

export async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${blob.type || 'application/octet-stream'};base64,${btoa(binary)}`;
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:([^;,]*)(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) throw new BackupError('Ungültiges Quittungsbild in der Sicherung.');
  const [, type = '', isBase64, payload = ''] = match;
  const binary = isBase64 ? atob(payload) : decodeURIComponent(payload);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new Blob([bytes], { type });
}

// --- Validierung -------------------------------------------------------------

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type Check = (value: unknown, path: string) => void;

function fail(path: string, expected: string): never {
  throw new BackupError(`Ungültige Sicherung: ${path} sollte ${expected} sein.`);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const str: Check = (v, p) => {
  if (typeof v !== 'string' || v === '') fail(p, 'ein Text');
};
const optStr: Check = (v, p) => {
  if (v !== undefined && typeof v !== 'string') fail(p, 'ein Text');
};
const isoDate: Check = (v, p) => {
  if (typeof v !== 'string' || !ISO_DATE.test(v)) fail(p, 'ein Datum (JJJJ-MM-TT)');
};
const optIsoDate: Check = (v, p) => {
  if (v !== undefined) isoDate(v, p);
};
const rappen: Check = (v, p) => {
  if (!Number.isInteger(v) || (v as number) < 0) fail(p, 'ein Betrag in Rappen (ganze Zahl)');
};
const optRappen: Check = (v, p) => {
  if (v !== undefined) rappen(v, p);
};
const count: Check = (v, p) => {
  if (!Number.isInteger(v) || (v as number) < 0) fail(p, 'eine ganze Zahl ≥ 0');
};
const interval: Check = (v, p) => {
  if (!INTERVALS.includes(v as Interval)) fail(p, `eines von ${INTERVALS.join(', ')}`);
};
const bool: Check = (v, p) => {
  if (typeof v !== 'boolean') fail(p, 'true oder false');
};
const oneOf =
  (...values: string[]): Check =>
  (v, p) => {
    if (!values.includes(v as string)) fail(p, `eines von ${values.join(', ')}`);
  };

function checkShape(value: unknown, path: string, shape: Record<string, Check>) {
  if (!isObject(value)) fail(path, 'ein Objekt');
  for (const [key, check] of Object.entries(shape)) check(value[key], `${path}.${key}`);
}

const contractCheck: Check = (v, p) => {
  if (v === undefined) return;
  checkShape(v, p, {
    provider: optStr,
    startDate: isoDate,
    minTermMonths: count,
    renewalTermMonths: count,
    reminderLeadDays: count,
    cancelledOn: optIsoDate,
    noticePeriod: (n, np) =>
      checkShape(n, np, { value: count, unit: oneOf('days', 'weeks', 'months') }),
  });
};

const SHAPES: Record<keyof BackupData, Record<string, Check>> = {
  categories: { id: str, name: str, icon: str, color: str, kind: oneOf('fixed', 'variable') },
  incomes: { id: str, name: str, amount: rappen, interval },
  recurringExpenses: {
    id: str,
    name: str,
    amount: rappen,
    interval,
    nextDueDate: isoDate,
    categoryId: str,
    active: bool,
    notes: optStr,
    contract: contractCheck,
    icon: optStr,
  },
  expenses: {
    id: str,
    amount: rappen,
    date: isoDate,
    categoryId: str,
    merchant: optStr,
    note: optStr,
    receiptImage: optStr,
    source: oneOf('manual', 'scan'),
  },
  settings: { key: str },
  products: {
    code: str,
    name: optStr,
    lastPrice: optRappen,
    categoryId: optStr,
    merchant: optStr,
    updatedAt: count,
  },
};

/** Schlüsselfeld je Tabelle (für die Prüfung auf doppelte Einträge). */
const KEY_FIELD: Partial<Record<keyof BackupData, string>> = { settings: 'key', products: 'code' };
/** Tabellen, die in älteren Sicherungen fehlen dürfen (dann leer). */
const OPTIONAL_TABLES = new Set<keyof BackupData>(['products']);

/** Prüft eine eingelesene Sicherungsdatei und liefert die Daten. */
export function parseBackup(json: unknown): BackupData {
  if (!isObject(json) || json.format !== BACKUP_FORMAT) {
    throw new BackupError('Diese Datei ist keine Budgetblick-Sicherung.');
  }
  if (typeof json.version !== 'number' || json.version > BACKUP_VERSION) {
    throw new BackupError(
      'Diese Sicherung stammt aus einer neueren Version von Budgetblick und kann nicht gelesen werden.',
    );
  }
  const data = json.data;
  if (!isObject(data)) fail('data', 'ein Objekt');

  for (const [table, shape] of Object.entries(SHAPES) as [
    keyof BackupData,
    Record<string, Check>,
  ][]) {
    if (data[table] === undefined && OPTIONAL_TABLES.has(table)) data[table] = [];
    const rows = data[table];
    if (!Array.isArray(rows)) fail(`data.${table}`, 'eine Liste');
    const ids = new Set<unknown>();
    rows.forEach((row, i) => {
      checkShape(row, `${table}[${i}]`, shape);
      const id = (row as Record<string, unknown>)[KEY_FIELD[table] ?? 'id'];
      if (ids.has(id))
        throw new BackupError(`Ungültige Sicherung: ${table} enthält „${id}" doppelt.`);
      ids.add(id);
    });
  }
  return data as unknown as BackupData;
}

/** Dateiname mit Datum, z. B. "budgetblick-sicherung-2026-09-25.json". */
export function backupFileName(todayISO: string): string {
  return `budgetblick-sicherung-${todayISO}.json`;
}
