import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/db';
import { renderApp, resetDb } from '../test/utils';

beforeEach(resetDb);

describe('Fixkosten-Bildschirm', () => {
  it('erfasst Einkommen und zeigt es im Monatstotal', async () => {
    const user = userEvent.setup();
    renderApp('/fixkosten');

    const incomeSection = screen.getByRole('region', { name: 'Einkommen' });
    await user.click(within(incomeSection).getByRole('button', { name: 'Hinzufügen' }));

    const dialog = await screen.findByRole('dialog', { name: 'Einkommen erfassen' });
    await user.type(within(dialog).getByLabelText('Betrag (CHF)'), '6500,50');
    await user.click(within(dialog).getByRole('button', { name: 'Speichern' }));

    expect(await within(incomeSection).findByText('Total pro Monat')).toBeInTheDocument();
    expect(within(incomeSection).getAllByText("CHF 6'500.50").length).toBeGreaterThan(0);
    expect((await db.incomes.toArray())[0]).toMatchObject({ name: 'Lohn', amount: 650050 });
  });

  it('validiert Pflichtfelder', async () => {
    const user = userEvent.setup();
    renderApp('/fixkosten');
    const section = screen.getByRole('region', { name: 'Wiederkehrende Kosten' });
    await user.click(within(section).getByRole('button', { name: 'Hinzufügen' }));
    const dialog = await screen.findByRole('dialog', { name: 'Fixkosten erfassen' });
    await user.type(within(dialog).getByLabelText('Betrag (CHF)'), 'abc');
    await user.click(within(dialog).getByRole('button', { name: 'Speichern' }));

    expect(within(dialog).getByText('Bitte einen Namen eingeben.')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Betrag (CHF)')).toHaveAttribute('aria-invalid', 'true');
    expect(await db.recurringExpenses.count()).toBe(0);
  });

  it('erfasst, bearbeitet und löscht Fixkosten und aktualisiert die Summen', async () => {
    const user = userEvent.setup();
    renderApp('/fixkosten');
    const section = screen.getByRole('region', { name: 'Wiederkehrende Kosten' });

    // Erfassen: jährliche Serafe-Gebühr
    await user.click(within(section).getByRole('button', { name: 'Hinzufügen' }));
    let dialog = await screen.findByRole('dialog', { name: 'Fixkosten erfassen' });
    await user.type(within(dialog).getByLabelText('Bezeichnung'), 'Serafe');
    await user.type(within(dialog).getByLabelText('Betrag (CHF)'), '335');
    await user.selectOptions(within(dialog).getByLabelText('Intervall'), 'yearly');
    await user.selectOptions(within(dialog).getByLabelText('Kategorie'), 'fix-serafe');
    await user.click(within(dialog).getByRole('button', { name: 'Speichern' }));

    const item = await within(section).findByRole('button', { name: /Serafe/ });
    expect(item).toHaveTextContent('CHF 27.92');
    expect(screen.getByText('Pro Jahr').nextElementSibling).toHaveTextContent('CHF 335.00');

    // Bearbeiten
    await user.click(item);
    dialog = await screen.findByRole('dialog', { name: 'Fixkosten bearbeiten' });
    const amount = within(dialog).getByLabelText('Betrag (CHF)');
    expect(amount).toHaveValue('335.00');
    await user.clear(amount);
    await user.type(amount, '360');
    await user.click(within(dialog).getByRole('button', { name: 'Speichern' }));
    await waitFor(() =>
      expect(screen.getByText('Pro Jahr').nextElementSibling).toHaveTextContent('CHF 360.00'),
    );

    // Löschen mit Bestätigung
    await user.click(within(section).getByRole('button', { name: /Serafe/ }));
    dialog = await screen.findByRole('dialog', { name: 'Fixkosten bearbeiten' });
    await user.click(within(dialog).getByRole('button', { name: 'Löschen' }));
    await user.click(within(dialog).getByRole('button', { name: 'Wirklich löschen' }));
    expect(await within(section).findByText(/Noch keine Fixkosten erfasst/)).toBeInTheDocument();
    expect(await db.recurringExpenses.count()).toBe(0);
  });
});

describe('Dashboard', () => {
  it('zeigt einen Hinweis ohne Einkommen', async () => {
    renderApp('/');
    expect(await screen.findByRole('link', { name: 'Einkommen erfassen' })).toBeInTheDocument();
  });

  it('zeigt freies Budget und die nächsten Abbuchungen', async () => {
    await db.incomes.add({ id: 'i', name: 'Lohn', amount: 600000, interval: 'monthly' });
    const nextYear = `${new Date().getFullYear() + 1}`;
    await db.recurringExpenses.bulkAdd([
      {
        id: 'r1',
        name: 'Miete',
        amount: 200000,
        interval: 'monthly',
        nextDueDate: `${nextYear}-01-01`,
        categoryId: 'fix-wohnen',
        active: true,
      },
      {
        id: 'r2',
        name: 'Pausiertes Abo',
        amount: 5000,
        interval: 'monthly',
        nextDueDate: `${nextYear}-01-01`,
        categoryId: 'fix-abos',
        active: false,
      },
    ]);
    renderApp('/');

    expect(await screen.findByTestId('free-budget')).toHaveTextContent("CHF 4'000.00");
    const upcoming = screen.getByRole('region', { name: 'Demnächst' });
    expect(within(upcoming).getAllByText('Miete')).toHaveLength(5);
    expect(within(upcoming).queryByText('Pausiertes Abo')).not.toBeInTheDocument();
    expect(within(upcoming).getByText(`01.01.${nextYear}`)).toBeInTheDocument();
  });
});
