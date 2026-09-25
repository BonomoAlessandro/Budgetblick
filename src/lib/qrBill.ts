/**
 * Liest den Inhalt eines QR-Codes. Erkannt wird die Swiss QR-Rechnung
 * (Implementation Guidelines SIX, Version 2.x): Zeilen getrennt durch CR+LF oder LF,
 * Header «SPC», Version «02xx», Codierung «1».
 */

export interface QrBill {
  iban: string;
  creditor: string;
  /** Rappen bzw. Cent; fehlt, wenn die Rechnung keinen Betrag vorgibt */
  amount?: number;
  currency: 'CHF' | 'EUR';
  reference?: string;
  /** Unstrukturierte Mitteilung, z.B. «Rechnung 2026-117» */
  message?: string;
}

export type QrContent =
  { kind: 'bill'; bill: QrBill } | { kind: 'url'; url: string } | { kind: 'other'; text: string };

/** Zeilennummern der Felder im Datenblock */
const LINE = {
  header: 0,
  version: 1,
  coding: 2,
  iban: 3,
  creditorName: 5,
  amount: 18,
  currency: 19,
  reference: 28,
  message: 29,
  trailer: 30,
} as const;

/** Betrag «1949.75» in Rappen, ohne Umweg über Gleitkommazahlen. */
function parseBillAmount(value: string): number | undefined {
  const match = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) return undefined;
  const rappen = Number(match[1]) * 100 + Number((match[2] ?? '0').padEnd(2, '0'));
  return rappen > 0 ? rappen : undefined;
}

export function parseQrBill(text: string): QrBill | null {
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const field = (index: number) => lines[index] ?? '';

  if (field(LINE.header) !== 'SPC') return null;
  if (!/^02\d\d$/.test(field(LINE.version)) || field(LINE.coding) !== '1') return null;
  if (field(LINE.trailer) !== 'EPD') return null;

  const currency = field(LINE.currency);
  if (currency !== 'CHF' && currency !== 'EUR') return null;

  return {
    iban: field(LINE.iban),
    creditor: field(LINE.creditorName),
    amount: parseBillAmount(field(LINE.amount)),
    currency,
    reference: field(LINE.reference) || undefined,
    message: field(LINE.message) || undefined,
  };
}

export function classifyQr(text: string): QrContent {
  const bill = parseQrBill(text);
  if (bill) return { kind: 'bill', bill };
  const trimmed = text.trim();
  if (/^https?:\/\/\S+$/i.test(trimmed)) return { kind: 'url', url: trimmed };
  return { kind: 'other', text: trimmed };
}
