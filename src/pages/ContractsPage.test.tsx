import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db/db';
import { renderApp, resetDb } from '../test/utils';
import type { RecurringExpense } from '../types';

// Nur Date einfrieren, damit Timer (userEvent, Dexie) normal weiterlaufen.
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 8, 20, 10, 0));
  await resetDb();
});
afterEach(() => {
  vi.useRealTimers();
});

function withContract(
  id: string,
  name: string,
  startDate: string,
  extra: Partial<RecurringExpense['contract']> = {},
): RecurringExpense {
  return {
    id,
    name,
    amount: 6500,
    interval: 'monthly',
    nextDueDate: '2026-10-01',
    categoryId: 'fix-telefon',
    active: true,
    contract: {
      provider: 'Swisscom',
      startDate,
      minTermMonths: 24,
      renewalTermMonths: 12,
      noticePeriod: { value: 3, unit: 'months' },
      reminderLeadDays: 14,
      ...extra,
    },
  };
}

describe('Vertragsdetails im Fixkosten-Formular', () => {
  it('erfasst einen Vertrag mit Live-Vorschau der Frist', async () => {
    const user = userEvent.setup();
    renderApp('/fixkosten');
    const section = screen.getByRole('region', { name: 'Wiederkehrende Kosten' });
    await user.click(within(section).getByRole('button', { name: 'Hinzufügen' }));
    const dialog = await screen.findByRole('dialog', { name: 'Fixkosten erfassen' });

    await user.type(within(dialog).getByLabelText('Bezeichnung'), 'Handy-Abo');
    await user.type(within(dialog).getByLabelText('Betrag (CHF)'), '65');
    await user.click(within(dialog).getByLabelText(/Vertragsdetails/));
    await user.type(within(dialog).getByLabelText('Anbieter'), 'Sunrise');
    const start = within(dialog).getByLabelText('Vertragsbeginn');
    await user.clear(start);
    await user.type(start, '2025-01-01');
    const minTerm = within(dialog).getByLabelText('Mindestlaufzeit (Monate)');
    await user.clear(minTerm);
    await user.type(minTerm, '24');

    expect(within(dialog).getByTestId('contract-preview')).toHaveTextContent(
      'Kündigen bis 30.09.2026 auf Vertragsende 31.12.2026',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Speichern' }));

    await waitFor(async () => expect(await db.recurringExpenses.count()).toBe(1));
    expect((await db.recurringExpenses.toArray())[0]!.contract).toEqual({
      provider: 'Sunrise',
      startDate: '2025-01-01',
      minTermMonths: 24,
      renewalTermMonths: 12,
      noticePeriod: { value: 3, unit: 'months' },
      reminderLeadDays: 14,
    });
  });

  it('verwendet die Standard-Vorlaufzeit aus den Einstellungen', async () => {
    await db.settings.put({ key: 'reminderLeadDays', value: 30 });
    const user = userEvent.setup();
    renderApp('/fixkosten');
    const section = screen.getByRole('region', { name: 'Wiederkehrende Kosten' });
    await user.click(within(section).getByRole('button', { name: 'Hinzufügen' }));
    const dialog = await screen.findByRole('dialog', { name: 'Fixkosten erfassen' });
    await user.click(within(dialog).getByLabelText(/Vertragsdetails/));
    expect(within(dialog).getByLabelText('Erinnerung (Tage vorher)')).toHaveValue('30');
  });

  it('meldet ungültige Vertragsangaben', async () => {
    const user = userEvent.setup();
    renderApp('/fixkosten');
    const section = screen.getByRole('region', { name: 'Wiederkehrende Kosten' });
    await user.click(within(section).getByRole('button', { name: 'Hinzufügen' }));
    const dialog = await screen.findByRole('dialog', { name: 'Fixkosten erfassen' });
    await user.type(within(dialog).getByLabelText('Bezeichnung'), 'Abo');
    await user.type(within(dialog).getByLabelText('Betrag (CHF)'), '10');
    await user.click(within(dialog).getByLabelText(/Vertragsdetails/));
    await user.clear(within(dialog).getByLabelText('Kündigungsfrist'));
    await user.type(within(dialog).getByLabelText('Kündigungsfrist'), 'drei');
    await user.click(within(dialog).getByRole('button', { name: 'Speichern' }));
    expect(within(dialog).getByText('Ganze Zahl, z. B. 3.')).toBeInTheDocument();
    expect(await db.recurringExpenses.count()).toBe(0);
  });
});

describe('Verträge-Ansicht', () => {
  beforeEach(async () => {
    await db.recurringExpenses.bulkAdd([
      withContract('bald', 'Handy-Abo', '2025-01-01'), // Frist 30.09.2026 → bald (10 Tage)
      withContract('ok', 'Internet', '2025-06-01'), // Frist 28.02.2027 → ok
      withContract('verpasst', 'Zeitung', '2024-11-01'), // Ende 31.10.2026, Frist 31.07. → verpasst
      {
        id: 'ohne',
        name: 'Miete',
        amount: 180000,
        interval: 'monthly',
        nextDueDate: '2026-10-01',
        categoryId: 'fix-wohnen',
        active: true,
      },
    ]);
  });

  it('zeigt die Zeitleiste sortiert nach Kündigungstermin mit Status', async () => {
    renderApp('/vertraege');
    const timeline = await screen.findByRole('list', { name: 'Zeitleiste nach Kündigungstermin' });
    const cards = within(timeline).getAllByRole('article');
    expect(cards.map((c) => c.getAttribute('aria-label'))).toEqual([
      'Zeitung',
      'Handy-Abo',
      'Internet',
    ]);
    expect(cards[0]).toHaveTextContent('Verpasst');
    expect(cards[0]).toHaveTextContent('verlängert sich bis 31.10.2027');
    expect(cards[1]).toHaveTextContent('Bald');
    expect(cards[1]).toHaveTextContent('30.09.2026');
    expect(cards[1]).toHaveTextContent('in 10 Tagen');
    expect(cards[2]).toHaveTextContent('OK');
    expect(screen.queryByText('Miete')).not.toBeInTheDocument();
  });

  it('markiert einen Vertrag als gekündigt und nimmt die Kündigung zurück', async () => {
    const user = userEvent.setup();
    renderApp('/vertraege');
    const card = await screen.findByRole('article', { name: 'Handy-Abo' });
    await user.click(within(card).getByRole('button', { name: 'Als gekündigt markieren' }));
    await user.click(within(card).getByRole('button', { name: 'Heute gekündigt' }));

    await waitFor(async () =>
      expect((await db.recurringExpenses.get('bald'))?.contract?.cancelledOn).toBe('2026-09-20'),
    );
    const updated = await screen.findByRole('article', { name: 'Handy-Abo' });
    expect(updated).toHaveTextContent('Gekündigt');
    expect(updated).toHaveTextContent('Läuft bis31.12.2026');

    await user.click(within(updated).getByRole('button', { name: 'Kündigung zurücknehmen' }));
    await waitFor(async () =>
      expect((await db.recurringExpenses.get('bald'))?.contract?.cancelledOn).toBeUndefined(),
    );
  });

  it('exportiert eine Kalender-Erinnerung als .ics', async () => {
    const createObjectURL = vi.fn((blob: Blob) => {
      void blob;
      return 'blob:ics';
    });
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const user = userEvent.setup();
    renderApp('/vertraege');
    const card = await screen.findByRole('article', { name: 'Handy-Abo' });
    await user.click(within(card).getByRole('button', { name: /Erinnerung in Kalender/ }));

    expect(click).toHaveBeenCalledOnce();
    const blob = createObjectURL.mock.calls[0]![0];
    const text = await blob.text();
    // Erinnerungsdatum 16.09. liegt in der Vergangenheit → Termin heute
    expect(text).toContain('DTSTART;VALUE=DATE:20260920');
    expect(text).toContain('SUMMARY:Kündigungsfrist: Handy-Abo (Swisscom)');
    click.mockRestore();
    vi.unstubAllGlobals();
  });
});

describe('Dashboard-Karte Fristen', () => {
  it('zeigt nur Verträge mit Handlungsbedarf', async () => {
    await db.recurringExpenses.bulkAdd([
      withContract('bald', 'Handy-Abo', '2025-01-01'),
      withContract('ok', 'Internet', '2025-06-01'),
      withContract('verpasst', 'Zeitung', '2024-11-01'),
      withContract('gekuendigt', 'Fitness', '2025-01-01', { cancelledOn: '2026-09-01' }),
    ]);
    renderApp('/');
    const card = await screen.findByRole('region', { name: 'Fristen' });
    expect(
      within(card)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual([expect.stringContaining('Zeitung'), expect.stringContaining('Handy-Abo')]);
    expect(card).toHaveTextContent('Kündigen bis 30.09.2026 · in 10 Tagen');
    expect(card).toHaveTextContent('Verlängert bis 31.10.2027');
  });

  it('wird ohne Handlungsbedarf nicht angezeigt', async () => {
    await db.recurringExpenses.add(withContract('ok', 'Internet', '2025-06-01'));
    renderApp('/');
    await screen.findByRole('region', { name: 'Demnächst' });
    expect(screen.queryByRole('region', { name: 'Fristen' })).not.toBeInTheDocument();
  });
});

describe('Automatische Deaktivierung', () => {
  it('nimmt beendete Verträge beim Start aus den Fixkosten', async () => {
    await db.recurringExpenses.add(
      withContract('alt', 'Altes Abo', '2023-01-01', { cancelledOn: '2025-01-15' }),
    );
    renderApp('/');
    await waitFor(async () => expect((await db.recurringExpenses.get('alt'))?.active).toBe(false));
  });
});
