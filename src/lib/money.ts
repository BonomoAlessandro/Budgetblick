/**
 * Geldbeträge werden intern als Rappen (Integer) geführt.
 * Anzeige im Schweizer Format: "CHF 1'234.50".
 */

/** Formatiert Rappen als "1'234.50" (ohne Währung). */
export function formatAmount(rappen: number): string {
  const sign = rappen < 0 ? '-' : '';
  const abs = Math.abs(Math.round(rappen));
  const francs = Math.floor(abs / 100);
  const cents = abs % 100;
  const grouped = String(francs).replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return `${sign}${grouped}.${String(cents).padStart(2, '0')}`;
}

/** Formatiert Rappen als "CHF 1'234.50". */
export function formatCHF(rappen: number): string {
  return `CHF ${formatAmount(rappen)}`;
}

/**
 * Wandelt eine Benutzereingabe in Rappen um. Akzeptiert Punkt oder Komma als
 * Dezimaltrennzeichen sowie Apostrophe und Leerzeichen als Tausendertrennzeichen.
 * Gibt `null` zurück, wenn die Eingabe kein gültiger, nicht-negativer Betrag ist.
 */
export function parseAmount(input: string): number | null {
  const cleaned = input
    .trim()
    .replace(/^CHF\s*/i, '')
    .replace(/['’\s]/g, '')
    .replace(',', '.');

  const match = /^(\d*)(?:\.(\d{0,2}))?$/.exec(cleaned);
  if (!match) return null;
  const intPart = match[1] ?? '';
  const fracPart = match[2] ?? '';
  if (intPart === '' && fracPart === '') return null;

  const francs = intPart === '' ? 0 : Number(intPart);
  const cents = Number(fracPart.padEnd(2, '0'));
  return francs * 100 + cents;
}

/** Rappen → Wert für Formularfelder, z. B. 123450 → "1234.50". */
export function toInputValue(rappen: number): string {
  return (rappen / 100).toFixed(2);
}
