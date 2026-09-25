import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/db';
import { todayISO } from '../lib/date';
import { renderApp, resetDb } from '../test/utils';

beforeEach(resetDb);

describe('Schnellerfassung', () => {
  it('speichert mit einem Tipp auf die Kategorie und fokussiert den Betrag', async () => {
    const user = userEvent.setup();
    await renderApp('/');
    await user.click(screen.getByRole('button', { name: 'Ausgabe erfassen' }));
    const dialog = await screen.findByRole('dialog', { name: 'Ausgabe erfassen' });

    const amount = await within(dialog).findByLabelText('Betrag in CHF');
    await waitFor(() => expect(amount).toHaveFocus());
    expect(amount).toHaveAttribute('inputmode', 'decimal');

    const group = within(dialog).getByRole('group', { name: 'Kategorie wählen und speichern' });
    expect(within(group).getAllByRole('button')).toHaveLength(6);

    await user.type(amount, '12,50');
    await user.click(within(group).getByRole('button', { name: /Lebensmittel/ }));

    expect(await screen.findByText('CHF 12.50 · Lebensmittel gespeichert')).toBeInTheDocument();
    const saved = await db.expenses.toArray();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      amount: 1250,
      date: todayISO(),
      categoryId: 'var-lebensmittel',
      source: 'manual',
    });

    // Im Dashboard unter „Letzte Ausgaben" und im Budget
    const recent = screen.getByRole('region', { name: 'Letzte Ausgaben' });
    expect(await within(recent).findByText('CHF 12.50')).toBeInTheDocument();
  });

  it('verlangt zuerst einen Betrag', async () => {
    const user = userEvent.setup();
    await renderApp('/');
    await user.click(screen.getByRole('button', { name: 'Ausgabe erfassen' }));
    const dialog = await screen.findByRole('dialog', { name: 'Ausgabe erfassen' });
    await user.click(await within(dialog).findByRole('button', { name: /Freizeit/ }));
    expect(within(dialog).getByText('Bitte zuerst einen Betrag eingeben.')).toBeInTheDocument();
    expect(await db.expenses.count()).toBe(0);
  });

  it('übernimmt optionale Angaben und weitere Kategorien', async () => {
    const user = userEvent.setup();
    await renderApp('/');
    await user.click(screen.getByRole('button', { name: 'Ausgabe erfassen' }));
    const dialog = await screen.findByRole('dialog', { name: 'Ausgabe erfassen' });
    await user.type(await within(dialog).findByLabelText('Betrag in CHF'), '30');
    await user.click(within(dialog).getByText('Datum, Händler, Notiz'));
    const date = within(dialog).getByLabelText('Datum');
    await user.clear(date);
    await user.type(date, '2026-09-01');
    await user.type(within(dialog).getByLabelText('Händler'), 'Blumen Meier');
    await user.click(within(dialog).getByRole('button', { name: /Weitere Kategorien/ }));
    await user.click(within(dialog).getByRole('button', { name: /Geschenke/ }));

    await waitFor(async () => expect(await db.expenses.count()).toBe(1));
    expect((await db.expenses.toArray())[0]).toMatchObject({
      amount: 3000,
      date: '2026-09-01',
      merchant: 'Blumen Meier',
      categoryId: 'var-geschenke',
    });
  });

  it('macht das Speichern rückgängig', async () => {
    const user = userEvent.setup();
    await renderApp('/');
    await user.click(screen.getByRole('button', { name: 'Ausgabe erfassen' }));
    const dialog = await screen.findByRole('dialog', { name: 'Ausgabe erfassen' });
    await user.type(await within(dialog).findByLabelText('Betrag in CHF'), '5');
    await user.click(within(dialog).getByRole('button', { name: /Transport/ }));
    await user.click(await screen.findByRole('button', { name: 'Rückgängig' }));
    await waitFor(async () => expect(await db.expenses.count()).toBe(0));
  });

  it('öffnet sich über den App-Shortcut-Parameter', async () => {
    await renderApp('/?erfassen');
    expect(await screen.findByRole('dialog', { name: 'Ausgabe erfassen' })).toBeVisible();
  });

  it('schlägt die häufigsten Kategorien vor', async () => {
    await db.expenses.bulkAdd(
      [1, 2, 3].map((i) => ({
        id: `g${i}`,
        amount: 100,
        date: todayISO(),
        categoryId: 'var-geschenke',
        source: 'manual' as const,
      })),
    );
    const user = userEvent.setup();
    await renderApp('/');
    await user.click(screen.getByRole('button', { name: 'Ausgabe erfassen' }));
    const group = await screen.findByRole('group', { name: 'Kategorie wählen und speichern' });
    await waitFor(() =>
      expect(within(group).getAllByRole('button')[0]).toHaveTextContent('Geschenke'),
    );
  });
});

describe('Ausgaben-Bildschirm', () => {
  const today = todayISO();
  const month = today.slice(0, 7);

  beforeEach(async () => {
    await db.expenses.bulkAdd([
      {
        id: 'a',
        amount: 4500,
        date: `${month}-01`,
        categoryId: 'var-lebensmittel',
        merchant: 'Migros',
        source: 'manual',
      },
      {
        id: 'b',
        amount: 1500,
        date: `${month}-01`,
        categoryId: 'var-restaurant',
        source: 'manual',
      },
      {
        id: 'c',
        amount: 2000,
        date: today,
        categoryId: 'var-lebensmittel',
        merchant: 'Coop',
        source: 'manual',
      },
    ]);
  });

  it('zeigt Monatsübersicht mit Legende und nach Tag gruppierte Liste', async () => {
    await renderApp('/ausgaben');
    const chart = await screen.findByRole('region', { name: 'Nach Kategorie' });
    const legend = await within(chart).findByRole('list', { name: 'Legende' });
    expect(
      within(legend).getByRole('button', { name: /Lebensmittel.*81 %.*CHF 65.00/ }),
    ).toBeInTheDocument();
    expect(
      within(legend).getByRole('button', { name: /Restaurant & Café.*19 %.*CHF 15.00/ }),
    ).toBeInTheDocument();
    expect(within(chart).getByText('CHF 80.00')).toBeInTheDocument();

    expect(screen.getByRole('region', { name: /1\. / })).toHaveTextContent('CHF 60.00');
    expect(screen.getByText('Migros')).toBeInTheDocument();
  });

  it('filtert nach Kategorie über Auswahl und Legende', async () => {
    const user = userEvent.setup();
    await renderApp('/ausgaben');
    await screen.findByText('Migros');
    await user.selectOptions(screen.getByLabelText('Kategorie'), 'var-restaurant');
    expect(screen.queryByText('Migros')).not.toBeInTheDocument();

    const legend = await screen.findByRole('list', { name: 'Legende' });
    await user.click(within(legend).getByRole('button', { name: /Lebensmittel/ }));
    expect(screen.getByText('Migros')).toBeInTheDocument();
    expect(
      screen.queryByText('Restaurant & Café', { selector: 'span.block' }),
    ).not.toBeInTheDocument();
  });

  it('wechselt den Monat', async () => {
    const user = userEvent.setup();
    await renderApp('/ausgaben');
    await screen.findByText('Migros');
    expect(screen.getByRole('button', { name: 'Nächster Monat' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Vorheriger Monat' }));
    expect(await screen.findByText(/Keine Ausgaben in diesem Monat/)).toBeInTheDocument();
  });

  it('bearbeitet und löscht eine Ausgabe', async () => {
    const user = userEvent.setup();
    await renderApp('/ausgaben');
    await user.click(await screen.findByRole('button', { name: /Migros/ }));
    let dialog = await screen.findByRole('dialog', { name: 'Ausgabe bearbeiten' });
    const amount = within(dialog).getByLabelText('Betrag (CHF)');
    expect(amount).toHaveValue('45.00');
    await user.clear(amount);
    await user.type(amount, '47.35');
    await user.click(within(dialog).getByRole('button', { name: 'Speichern' }));
    await waitFor(async () => expect((await db.expenses.get('a'))?.amount).toBe(4735));

    await user.click(await screen.findByRole('button', { name: /Migros/ }));
    dialog = await screen.findByRole('dialog', { name: 'Ausgabe bearbeiten' });
    await user.click(within(dialog).getByRole('button', { name: 'Löschen' }));
    await user.click(within(dialog).getByRole('button', { name: 'Wirklich löschen' }));
    await waitFor(async () => expect(await db.expenses.get('a')).toBeUndefined());
    expect(screen.queryByText('Migros')).not.toBeInTheDocument();
  });
});
