import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db/db';
import { SETTING_PRODUCT_LOOKUP } from '../db/hooks';
import { qrBillPayload } from '../test/qrBill';
import { renderApp, resetDb } from '../test/utils';

// jsdom hat weder Kamera noch WebAssembly-Leser: Es bleibt der Weg über ein Foto,
// das Lesen des Codes wird ersetzt. Parser, Datenbank und Formular laufen echt.
const readCode = vi.fn();
vi.mock('../lib/codeReader', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/codeReader')>()),
  loadCodeReader: async () => ({}),
  readCode: (...args: unknown[]) => readCode(...args),
}));

const RED_BULL = '9002490100070';
const photo = new File(['foto'], 'code.jpg', { type: 'image/jpeg' });
const qr = (text: string) => ({ text, format: 'qr_code' });
const ean = (text: string) => ({ text, format: 'ean_13' });

function mockFetch(response: () => Promise<Response>) {
  const fetchMock = vi.fn<(input: RequestInfo | URL) => Promise<Response>>(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function scan(code: { text: string; format: string } | undefined) {
  readCode.mockResolvedValue(code);
  const user = userEvent.setup();
  await renderApp('/');
  await user.click(screen.getByRole('button', { name: 'Ausgabe erfassen' }));
  const quickAdd = await screen.findByRole('dialog', { name: 'Ausgabe erfassen' });
  await user.click(within(quickAdd).getByRole('button', { name: /Barcode scannen/ }));
  const dialog = await screen.findByRole('dialog', { name: 'Code scannen' });
  expect(within(dialog).getByText(/Kamera ist in diesem Browser nicht verfügbar/)).toBeVisible();
  await user.upload(within(dialog).getByLabelText('Foto des Codes wählen'), photo);
  return { user, dialog };
}

beforeEach(async () => {
  readCode.mockReset();
  await resetDb();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Barcode scannen', () => {
  it('schlägt ein unbekanntes Produkt nach und merkt es sich beim Speichern', async () => {
    const fetchMock = mockFetch(async () =>
      Response.json({ status: 1, product: { product_name: 'Red Bull', brands: 'Red Bull' } }),
    );
    const { user, dialog } = await scan(ean(RED_BULL));

    expect(await within(dialog).findByText(/Red Bull \(Open Food Facts\)/)).toBeVisible();
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(`/product/${RED_BULL}.json`);
    expect(within(dialog).getByLabelText('Notiz')).toHaveValue('Red Bull');
    expect(within(dialog).getByLabelText('Kategorie')).toHaveValue('var-lebensmittel');

    await user.type(within(dialog).getByLabelText(/Betrag/), '1.95');
    await user.type(within(dialog).getByLabelText('Händler'), 'Coop');
    await user.click(within(dialog).getByRole('button', { name: 'Ausgabe speichern' }));

    await waitFor(async () => expect(await db.expenses.count()).toBe(1));
    expect(await db.products.get(RED_BULL)).toMatchObject({
      name: 'Red Bull',
      lastPrice: 195,
      categoryId: 'var-lebensmittel',
      merchant: 'Coop',
    });
  });

  it('füllt ein bekanntes Produkt aus dem Speicher vor, ohne nachzuschlagen', async () => {
    const fetchMock = mockFetch(async () => Response.json({}));
    await db.products.put({
      code: RED_BULL,
      name: 'Red Bull 250 ml',
      lastPrice: 195,
      categoryId: 'var-lebensmittel',
      merchant: 'Coop',
      updatedAt: 1,
    });
    const { dialog } = await scan(ean(RED_BULL));

    expect(await within(dialog).findByText(/Preis vom letzten Kauf übernommen/)).toBeVisible();
    expect(within(dialog).getByLabelText(/Betrag/)).toHaveValue('1.95');
    expect(within(dialog).getByLabelText('Notiz')).toHaveValue('Red Bull 250 ml');
    expect(within(dialog).getByLabelText('Händler')).toHaveValue('Coop');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('schlägt nicht nach, wenn die Produktsuche ausgeschaltet ist', async () => {
    const fetchMock = mockFetch(async () => Response.json({}));
    await db.settings.put({ key: SETTING_PRODUCT_LOOKUP, value: false });
    const { dialog } = await scan(ean(RED_BULL));

    expect(
      await within(dialog).findByText(/Artikel 9002490100070 ist nicht bekannt/),
    ).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('funktioniert auch offline, mit Hinweis', async () => {
    mockFetch(async () => {
      throw new TypeError('Failed to fetch');
    });
    const { dialog } = await scan(ean(RED_BULL));

    expect(await within(dialog).findByText(/konnte nicht nachgeschlagen werden/)).toBeVisible();
    expect(within(dialog).getByLabelText(/Betrag/)).toHaveValue('');
  });
});

describe('QR-Rechnung scannen', () => {
  it('füllt Betrag, Empfänger und Mitteilung vor und speichert erst nach Bestätigung', async () => {
    const { user, dialog } = await scan(qr(qrBillPayload()));

    expect(
      await within(dialog).findByText(/QR-Rechnung von Robert Schneider AG erkannt/),
    ).toBeVisible();
    expect(within(dialog).getByLabelText(/Betrag/)).toHaveValue('1949.75');
    expect(within(dialog).getByLabelText('Händler')).toHaveValue('Robert Schneider AG');
    expect(within(dialog).getByLabelText('Notiz')).toHaveValue('Auftrag vom 15.06.2026');
    expect(await db.expenses.count()).toBe(0);

    await user.click(within(dialog).getByRole('button', { name: 'Ausgabe speichern' }));
    await waitFor(async () => expect(await db.expenses.count()).toBe(1));
    const [saved] = await db.expenses.toArray();
    expect(saved).toMatchObject({
      amount: 194975,
      merchant: 'Robert Schneider AG',
      source: 'scan',
    });
    expect(await db.products.count()).toBe(0);
  });

  it('übernimmt bei Euro-Rechnungen keinen Betrag', async () => {
    const { dialog } = await scan(qr(qrBillPayload({ currency: 'EUR', amount: '20' })));

    expect(await within(dialog).findByText(/lautet auf EUR 20.00/)).toBeVisible();
    expect(within(dialog).getByLabelText(/Betrag/)).toHaveValue('');
  });

  it('zeigt bei einem Link den Inhalt an und führt zurück zur Schnellerfassung', async () => {
    const { user, dialog } = await scan(qr('https://beleg.example.ch/123'));

    expect(
      await within(dialog).findByRole('link', { name: 'https://beleg.example.ch/123' }),
    ).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: 'Manuell erfassen' }));
    expect(await screen.findByRole('dialog', { name: 'Ausgabe erfassen' })).toBeVisible();
  });

  it('meldet, wenn auf dem Foto kein Code gefunden wird', async () => {
    const { dialog } = await scan(undefined);

    expect(await within(dialog).findByText(/kein Code gefunden/)).toBeVisible();
  });
});
