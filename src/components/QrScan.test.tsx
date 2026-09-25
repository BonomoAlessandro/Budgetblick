import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db/db';
import { qrBillPayload } from '../test/qrBill';
import { renderApp, resetDb } from '../test/utils';

// jsdom hat weder Kamera noch WebAssembly-Leser: Es bleibt der Weg über ein Foto,
// das Lesen des QR-Codes wird ersetzt. Parser und Formular laufen echt.
const readQr = vi.fn();
vi.mock('../lib/qrReader', () => ({
  loadQrReader: async () => ({}),
  readQr: (...args: unknown[]) => readQr(...args),
}));

const photo = new File(['foto'], 'qr.jpg', { type: 'image/jpeg' });

async function openQrScan() {
  const user = userEvent.setup();
  await renderApp('/');
  await user.click(screen.getByRole('button', { name: 'Ausgabe erfassen' }));
  const quickAdd = await screen.findByRole('dialog', { name: 'Ausgabe erfassen' });
  await user.click(within(quickAdd).getByRole('button', { name: /QR-Rechnung/ }));
  const dialog = await screen.findByRole('dialog', { name: 'QR-Rechnung scannen' });
  expect(within(dialog).getByText(/Kamera ist in diesem Browser nicht verfügbar/)).toBeVisible();
  return { user, dialog };
}

beforeEach(async () => {
  readQr.mockReset();
  await resetDb();
});

describe('QR-Rechnung scannen', () => {
  it('füllt Betrag, Empfänger und Mitteilung vor und speichert erst nach Bestätigung', async () => {
    readQr.mockResolvedValue(qrBillPayload());
    const { user, dialog } = await openQrScan();

    await user.upload(within(dialog).getByLabelText('Foto des QR-Codes wählen'), photo);

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
  });

  it('übernimmt bei Euro-Rechnungen keinen Betrag', async () => {
    readQr.mockResolvedValue(qrBillPayload({ currency: 'EUR', amount: '20' }));
    const { user, dialog } = await openQrScan();

    await user.upload(within(dialog).getByLabelText('Foto des QR-Codes wählen'), photo);

    expect(await within(dialog).findByText(/lautet auf EUR 20.00/)).toBeVisible();
    expect(within(dialog).getByLabelText(/Betrag/)).toHaveValue('');
  });

  it('zeigt bei einem Link den Inhalt an und führt zurück zur Schnellerfassung', async () => {
    readQr.mockResolvedValue('https://beleg.example.ch/123');
    const { user, dialog } = await openQrScan();

    await user.upload(within(dialog).getByLabelText('Foto des QR-Codes wählen'), photo);

    expect(
      await within(dialog).findByRole('link', { name: 'https://beleg.example.ch/123' }),
    ).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: 'Manuell erfassen' }));
    expect(await screen.findByRole('dialog', { name: 'Ausgabe erfassen' })).toBeVisible();
  });

  it('meldet, wenn auf dem Foto kein QR-Code gefunden wird', async () => {
    readQr.mockResolvedValue(undefined);
    const { user, dialog } = await openQrScan();

    await user.upload(within(dialog).getByLabelText('Foto des QR-Codes wählen'), photo);

    expect(await within(dialog).findByText(/kein QR-Code gefunden/)).toBeVisible();
  });
});
