import { describe, expect, it } from 'vitest';
import { extractAmounts, findDate, parseReceipt } from './receiptParser';

const TODAY = '2026-09-25';

const MIGROS = `
MIGROS
Genossenschaft Migros Zürich
M Limmatplatz
Limmatstrasse 152, 8005 Zürich

Bio Vollmilch 1l            1.95
Ruchbrot 500g               2.60
Äpfel Gala 1kg              3.90
Emmentaler mild            5.45
M-Budget Pasta 3x          2.85
Zwischensumme          CHF 16.75
Aktion Pasta              -0.50
Total CHF                  16.25
Bar                        20.00
Rückgeld                    3.75
MWST 2.6%   Total 16.25   0.41
Cumulus Punkte 16
23.09.26 17:42  Kasse 7  Bon 4411
`;

const COOP = `
C00P
Coop City Bern Bahnhof
Bahnhofplatz 10, 3011 Bern
Datum: 12.09.2026  Zeit: 12:03
Sandwich Poulet          6.50
Mineralwasser 0.5l       1.80
Supercard Punkte: 8
Summe                    8.30
Bezahlt Karte            8.30
`;

const DENNER = `
DENNER AG
Filiale Winterthur
Rotwein Merlot       7.95
Chips Paprika        2.10
Zu bezahlen:
CHF 10.05
MwSt 8.1%            0.75
05.09.2026
`;

const RESTAURANT = `
** Café Sprüngli **
Paradeplatz, Zürich
2 Cappuccino       2x 5.80  11.60
1 Luxemburgerli 6er          9.50
Totalbetrag CHF             21.10
inkl. MWST 8.1%              1.58
Trinkgeld herzlich willkommen
Datum 01.09.2026
`;

const BAUMARKT = `
JUMBO Baumarkt
Dietlikon
Bohrmaschine        CHF 1'249.-
Schrauben            CHF 12.90
Gesamt              CHF 1'261.90
Zahlung Maestro
14.08.2026
`;

describe('extractAmounts', () => {
  it.each([
    ['Total 16.25', [1625]],
    ['Summe 8,30', [830]],
    ["Total CHF 1'234.50", [123450]],
    ['Total CHF 1’234.50', [123450]],
    ['Bohrmaschine CHF 49.-', [4900]],
    ['Preis 49.– Aktion', [4900]],
    ['2x 5.80  11.60', [580, 1160]],
    ['Datum 23.09.26', []],
    ['12:03 Uhr', []],
    ['0.00', []],
  ])('%s → %o', (line, expected) => {
    expect(extractAmounts(line)).toEqual(expected);
  });
});

describe('findDate', () => {
  it.each([
    ['23.09.26 17:42', '2026-09-23'],
    ['Datum: 12.09.2026', '2026-09-12'],
    ['1.9.2026', '2026-09-01'],
    ['29.02.2024', '2024-02-29'],
  ])('%s → %s', (text, expected) => {
    expect(findDate(text, TODAY)).toBe(expected);
  });

  it('überspringt ungültige und zukünftige Daten', () => {
    expect(findDate('31.02.2026 und 15.09.2026', TODAY)).toBe('2026-09-15');
    expect(findDate('Gültig bis 31.12.2026, gekauft 20.09.2026', TODAY)).toBe('2026-09-20');
    expect(findDate('29.02.2025', TODAY)).toBeUndefined();
  });

  it('verwechselt Beträge nicht mit Daten', () => {
    expect(findDate('Total 16.25', TODAY)).toBeUndefined();
  });
});

describe('parseReceipt', () => {
  it('liest eine Migros-Quittung (Total statt Zwischensumme, ohne Bar/Rückgeld)', () => {
    expect(parseReceipt(MIGROS, TODAY)).toEqual({
      amount: 1625,
      date: '2026-09-23',
      merchant: 'Migros',
      categoryId: 'var-lebensmittel',
    });
  });

  it('nimmt bei einer Artikeltabelle nicht die Kopfzeile «… Total #» und ignoriert EUR', () => {
    // OCR-Text eines echten Migros-Fotos (gekürzt)
    const text = `Genossenschaft Migros Zürich
MM Wollishofen
Artikelbezeichnung Menge Preis Gespart Total #
| Kellogg's Chocos 5809 1 5,70 5.20 1
Beyond Burger 1 5,95 5.95 1
Coca-Cola Vanilla 1 1.10 1.10 1
Total CHF 23.25
Visa 23.25
Total in EUR 26.42`;
    expect(parseReceipt(text, TODAY)).toMatchObject({ amount: 2325, merchant: 'Migros' });
    expect(parseReceipt('Total in EUR 26.42\nVisa 23.25', TODAY).amount).toBeUndefined();
  });

  it('erkennt Coop trotz OCR-Fehler „C00P" und nimmt „Summe"', () => {
    expect(parseReceipt(COOP, TODAY)).toEqual({
      amount: 830,
      date: '2026-09-12',
      merchant: 'Coop',
      categoryId: 'var-lebensmittel',
    });
  });

  it('findet den Betrag in der Zeile nach „Zu bezahlen"', () => {
    expect(parseReceipt(DENNER, TODAY)).toMatchObject({
      amount: 1005,
      date: '2026-09-05',
      merchant: 'Denner',
    });
  });

  it('verwendet bei unbekannten Händlern die erste Textzeile', () => {
    expect(parseReceipt(RESTAURANT, TODAY)).toEqual({
      amount: 2110,
      date: '2026-09-01',
      merchant: 'Café Sprüngli',
      categoryId: undefined,
    });
  });

  it('nimmt ohne Total-Zeile die grösste Zahl in CHF-Zeilen', () => {
    expect(parseReceipt(BAUMARKT, TODAY)).toMatchObject({
      amount: 126190,
      date: '2026-08-14',
      merchant: 'JUMBO Baumarkt',
    });
  });

  it.each([
    ['Lidl Schweiz\nTotal 23.40', 'Lidl'],
    ['ALDI SUISSE AG\nTotal 12.00', 'Aldi'],
    ['Volg Konsumverein\nTotal 5.00', 'Volg'],
  ])('erkennt bekannte Händler: %s', (text, merchant) => {
    expect(parseReceipt(text, TODAY)).toMatchObject({ merchant, categoryId: 'var-lebensmittel' });
  });

  it('schlägt bei Manor die Kategorie Shopping vor', () => {
    expect(parseReceipt('MANOR\nTotal 89.90', TODAY).categoryId).toBe('var-shopping');
  });

  it('liefert leere Felder bei unlesbarem Text', () => {
    expect(parseReceipt('~~ ## ..\n  \n', TODAY)).toEqual({
      amount: undefined,
      date: undefined,
      merchant: undefined,
      categoryId: undefined,
    });
  });
});
