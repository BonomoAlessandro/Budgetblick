/**
 * Liest Betrag, Datum und Händler aus dem OCR-Text einer Quittung.
 * Das Ergebnis ist nur ein Vorschlag – der Nutzer bestätigt oder korrigiert immer.
 */

export interface ParsedReceipt {
  /** Rappen */
  amount?: number;
  /** ISO-Datum */
  date?: string;
  merchant?: string;
  /** Vorgeschlagene Kategorie bei bekannten Händlern */
  categoryId?: string;
}

interface KnownMerchant {
  name: string;
  pattern: RegExp;
  categoryId: string;
}

export const KNOWN_MERCHANTS: KnownMerchant[] = [
  { name: 'Migros', pattern: /\bmigros\b/, categoryId: 'var-lebensmittel' },
  { name: 'Coop', pattern: /\bcoop\b/, categoryId: 'var-lebensmittel' },
  { name: 'Denner', pattern: /\bdenner\b/, categoryId: 'var-lebensmittel' },
  { name: 'Aldi', pattern: /\baldi\b/, categoryId: 'var-lebensmittel' },
  { name: 'Lidl', pattern: /\blidl\b/, categoryId: 'var-lebensmittel' },
  { name: 'Volg', pattern: /\bvolg\b/, categoryId: 'var-lebensmittel' },
  { name: 'Manor', pattern: /\bmanor\b/, categoryId: 'var-shopping' },
];

/** Obergrenze für plausible Beträge (CHF 100'000). */
const MAX_PLAUSIBLE_RAPPEN = 10_000_000;

const TOTAL_KEYWORDS = /\b(total(betrag)?|summe|zu bezahlen|zu zahlen)\b/;
const CURRENCY_KEYWORD = /\bchf\b/;
/** Zeilen mit diesen Begriffen enthalten nicht den zu bezahlenden Betrag. */
const EXCLUDED =
  /(zwischen|sub ?total|mwst|mehrwert|r[üu]ckgeld|retour|gegeben|rabatt|\bbar\b|punkte|cumulus|supercard|\beur\b|euro)/;

/** Für den Abgleich: Kleinbuchstaben, typische OCR-Verwechslungen korrigiert. */
function normalize(line: string): string {
  return line.toLowerCase().replace(/(?<=[a-z])0|0(?=[a-z])/g, 'o');
}

/**
 * Alle Beträge in einer Zeile in Rappen. Erkennt 12.50, 12,50, 1'234.50,
 * 1’234.50 sowie die Schweizer Schreibweise 12.– / 12.-.
 */
export function extractAmounts(line: string): number[] {
  // Nicht Teil eines Datums wie 23.09.26: keine Ziffer/Trennzeichen davor, kein „.26" danach.
  const pattern = /(?<![\d'’]|\d[.,])(\d{1,3}(?:['’]\d{3})+|\d+)[.,](\d{2}|[-–—])(?!\d|[.,]\d)/g;
  const result: number[] = [];
  for (const match of line.matchAll(pattern)) {
    const francs = Number((match[1] ?? '').replace(/['’]/g, ''));
    const fraction = match[2] ?? '';
    const cents = /^\d{2}$/.test(fraction) ? Number(fraction) : 0;
    const rappen = francs * 100 + cents;
    if (rappen > 0 && rappen <= MAX_PLAUSIBLE_RAPPEN) result.push(rappen);
  }
  return result;
}

/** Steht ausser dem Schlüsselwort (und «CHF») kein weiterer Text in der Zeile? */
function standsAlone(line: string): boolean {
  const rest = line.replace(TOTAL_KEYWORDS, '').replace(CURRENCY_KEYWORD, '');
  return (rest.match(/\p{L}/gu) ?? []).length <= 2;
}

function findAmount(lines: string[]): number | undefined {
  const normalized = lines.map(normalize);

  // 1. Zeile mit „Total", „Summe" oder „Zu bezahlen" – steht der Betrag nicht in
  //    derselben Zeile, schauen wir in die nächste (häufig bei zweispaltigem Layout).
  for (let i = 0; i < lines.length; i += 1) {
    const line = normalized[i]!;
    if (!TOTAL_KEYWORDS.test(line) || EXCLUDED.test(line)) continue;
    const amounts = extractAmounts(lines[i]!);
    if (amounts.length > 0) return Math.max(...amounts);
    // Nur wenn „Total" (evtl. mit „CHF") allein steht – nicht bei Tabellenköpfen wie
    // „Artikel Menge Preis Total", deren nächste Zeile der erste Artikel ist.
    if (!standsAlone(line)) continue;
    const next = lines[i + 1];
    if (next && !EXCLUDED.test(normalize(next))) {
      const nextAmounts = extractAmounts(next);
      if (nextAmounts.length > 0) return Math.max(...nextAmounts);
    }
  }

  // 2. Sonst die grösste Zahl in Zeilen mit „CHF".
  const chfAmounts = lines
    .filter((_, i) => CURRENCY_KEYWORD.test(normalized[i]!) && !EXCLUDED.test(normalized[i]!))
    .flatMap(extractAmounts);
  return chfAmounts.length > 0 ? Math.max(...chfAmounts) : undefined;
}

function toISO(year: number, month: number, day: number): string | undefined {
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return undefined;
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Erstes gültiges Datum im Format TT.MM.JJ oder TT.MM.JJJJ, das nicht in der Zukunft liegt. */
export function findDate(text: string, todayISO?: string): string | undefined {
  const pattern = /(?<!\d)(\d{1,2})\.(\d{1,2})\.(\d{4}|\d{2})(?!\d)/g;
  for (const match of text.matchAll(pattern)) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const rawYear = match[3] ?? '';
    const year = rawYear.length === 2 ? 2000 + Number(rawYear) : Number(rawYear);
    if (year < 2000) continue;
    const iso = toISO(year, month, day);
    if (iso && (!todayISO || iso <= todayISO)) return iso;
  }
  return undefined;
}

function findMerchant(lines: string[]): { merchant?: string; categoryId?: string } {
  // Bekannte Händler irgendwo im Kopfbereich (Name steht oft nicht in der ersten Zeile).
  const head = lines.slice(0, 8).map(normalize);
  for (const known of KNOWN_MERCHANTS) {
    if (head.some((line) => known.pattern.test(line))) {
      return { merchant: known.name, categoryId: known.categoryId };
    }
  }
  // Sonst die erste Zeile mit echtem Text (mindestens drei Buchstaben).
  const first = lines.find((line) => (line.match(/\p{L}/gu) ?? []).length >= 3);
  if (!first) return {};
  const cleaned = first
    .replace(/\s+/g, ' ')
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}.)]+$/gu, '')
    .slice(0, 40)
    .trim();
  return cleaned ? { merchant: cleaned } : {};
}

export function parseReceipt(text: string, todayISO?: string): ParsedReceipt {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const { merchant, categoryId } = findMerchant(lines);
  return {
    amount: findAmount(lines),
    date: findDate(text, todayISO),
    merchant,
    categoryId,
  };
}
