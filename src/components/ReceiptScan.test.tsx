import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db/db';
import { renderApp, resetDb } from '../test/utils';

// Canvas und Tesseract gibt es in jsdom nicht – Bildvorbereitung und OCR werden ersetzt,
// Parser und Formular laufen echt.
const recognizeText = vi.fn();
vi.mock('../lib/ocr', () => ({
  recognizeText: (...args: unknown[]) => recognizeText(...args),
}));
vi.mock('../lib/image', () => ({
  prepareReceipt: async () => ({
    ocrImage: new Blob(['ocr'], { type: 'image/png' }),
    storedImage: new Blob(['jpeg'], { type: 'image/jpeg' }),
  }),
}));

const RECEIPT = `MIGROS
Genossenschaft Migros Aare
Brot 3.20
Käse 8.95
Total CHF 12.15
Bar 20.00
Rückgeld 7.85
21.09.26 10:15`;

const photo = new File(['foto'], 'quittung.jpg', { type: 'image/jpeg' });

async function openScan() {
  const user = userEvent.setup();
  await renderApp('/');
  await user.click(screen.getByRole('button', { name: 'Ausgabe erfassen' }));
  const dialog = await screen.findByRole('dialog', { name: 'Ausgabe erfassen' });
  const input = within(dialog).getByLabelText(/Quittung scannen/);
  expect(input).toHaveAttribute('accept', 'image/*');
  expect(input).toHaveAttribute('capture', 'environment');
  await user.upload(input, photo);
  return user;
}

beforeEach(async () => {
  recognizeText.mockReset();
  await resetDb();
});

describe('Quittungsscan', () => {
  it('zeigt eine Ladeanzeige und danach das vorausgefüllte Formular, ohne zu speichern', async () => {
    let finish: (text: string) => void = () => {};
    recognizeText.mockImplementation(
      (_image: Blob, onProgress?: (p: { step: string; progress: number }) => void) =>
        new Promise<string>((resolve) => {
          onProgress?.({ step: 'recognizing', progress: 0.4 });
          finish = resolve;
        }),
    );
    const user = await openScan();

    const dialog = await screen.findByRole('dialog', { name: 'Quittung prüfen' });
    expect(await within(dialog).findByText('Text wird erkannt …')).toBeInTheDocument();
    expect(within(dialog).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40');

    finish(RECEIPT);
    expect(await within(dialog).findByText(/Erkannt: Betrag, Datum, Händler/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Betrag (CHF)')).toHaveValue('12.15');
    expect(within(dialog).getByLabelText('Datum')).toHaveValue('2026-09-21');
    expect(within(dialog).getByLabelText('Händler')).toHaveValue('Migros');
    expect(within(dialog).getByLabelText('Kategorie')).toHaveValue('var-lebensmittel');
    expect(within(dialog).getByRole('img', { name: 'Quittung' })).toBeInTheDocument();

    // Nie automatisch speichern
    expect(await db.expenses.count()).toBe(0);

    await user.clear(within(dialog).getByLabelText('Betrag (CHF)'));
    await user.type(within(dialog).getByLabelText('Betrag (CHF)'), '12.50');
    await user.click(within(dialog).getByRole('button', { name: 'Ausgabe speichern' }));

    await waitFor(async () => expect(await db.expenses.count()).toBe(1));
    const saved = (await db.expenses.toArray())[0]!;
    expect(saved).toMatchObject({
      amount: 1250,
      date: '2026-09-21',
      merchant: 'Migros',
      categoryId: 'var-lebensmittel',
      source: 'scan',
    });
    // fake-indexeddb klont Blobs unter Node nicht originalgetreu; im Browser bleibt es ein Blob.
    expect(saved.receiptImage).toBeDefined();
    expect(await screen.findByText('CHF 12.50 gespeichert')).toBeInTheDocument();
  });

  it('erlaubt manuelle Eingabe, wenn die Erkennung fehlschlägt', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    recognizeText.mockRejectedValue(new Error('offline'));
    const user = await openScan();
    const dialog = await screen.findByRole('dialog', { name: 'Quittung prüfen' });
    expect(await within(dialog).findByText(/Texterkennung ist fehlgeschlagen/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Betrag (CHF)')).toHaveValue('');

    await user.type(within(dialog).getByLabelText('Betrag (CHF)'), '7');
    await user.click(within(dialog).getByRole('button', { name: 'Ausgabe speichern' }));
    await waitFor(async () => expect(await db.expenses.count()).toBe(1));
    expect((await db.expenses.toArray())[0]).toMatchObject({ amount: 700, source: 'scan' });
  });

  it('meldet, wenn nichts erkannt wurde', async () => {
    recognizeText.mockResolvedValue('~~~ ###');
    await openScan();
    const dialog = await screen.findByRole('dialog', { name: 'Quittung prüfen' });
    expect(await within(dialog).findByText(/Es konnte nichts erkannt werden/)).toBeInTheDocument();
  });

  it('kehrt beim Verwerfen zur Schnellerfassung zurück', async () => {
    recognizeText.mockResolvedValue(RECEIPT);
    const user = await openScan();
    const dialog = await screen.findByRole('dialog', { name: 'Quittung prüfen' });
    await user.click(await within(dialog).findByRole('button', { name: 'Verwerfen' }));
    expect(await screen.findByRole('dialog', { name: 'Ausgabe erfassen' })).toBeInTheDocument();
    expect(await db.expenses.count()).toBe(0);
  });
});
