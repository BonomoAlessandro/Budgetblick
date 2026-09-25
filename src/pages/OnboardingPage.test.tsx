import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/db';
import { renderApp, resetDb } from '../test/utils';

beforeEach(() => resetDb({ onboarding: true }));

describe('Einrichtungs-Assistent', () => {
  it('führt durch Einkommen, Fixkosten und Abschluss', async () => {
    const user = userEvent.setup();
    await renderApp('/', { onboarding: true });

    // Schritt 1: Einkommen
    expect(screen.getByRole('heading', { name: 'Willkommen bei Budgetblick' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Betrag (CHF)'), '6000');
    await user.click(screen.getByRole('button', { name: 'Speichern' }));

    // Schritt 2: Fixkosten aus Vorschlägen – Assistent bleibt trotz gespeicherter Daten offen
    expect(await screen.findByText('Schritt 2 von 3')).toBeInTheDocument();
    const suggestions = screen.getByRole('list', { name: 'Vorschläge' });
    await user.click(within(suggestions).getByRole('button', { name: /Miete/ }));
    const form = screen.getByRole('form', { name: 'Miete erfassen' });
    await user.type(within(form).getByLabelText('Betrag (CHF)'), '1800');
    await user.click(within(form).getByRole('button', { name: 'Hinzufügen' }));

    // Serafe ist mit dem schweizweit einheitlichen Betrag vorausgefüllt
    await user.click(
      await within(screen.getByRole('list', { name: 'Vorschläge' })).findByRole('button', {
        name: /Serafe/,
      }),
    );
    const serafe = screen.getByRole('form', { name: 'Serafe erfassen' });
    expect(within(serafe).getByLabelText('Betrag (CHF)')).toHaveValue('335.00');
    expect(within(serafe).getByLabelText('Intervall')).toHaveValue('yearly');
    await user.click(within(serafe).getByRole('button', { name: 'Hinzufügen' }));

    const added = await screen.findByRole('region', { name: 'Erfasste Fixkosten' });
    await waitFor(() => expect(within(added).getAllByRole('listitem')).toHaveLength(2));
    expect(added).toHaveTextContent("Total pro Monat: CHF 1'827.92");
    expect(
      within(screen.getByRole('list', { name: 'Vorschläge' })).queryByRole('button', {
        name: /^.?Miete$/,
      }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Weiter' }));

    // Schritt 3: Fertig
    expect(await screen.findByText('Schritt 3 von 3')).toBeInTheDocument();
    expect(screen.getByText("CHF 4'172.08")).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: "Los geht's" }));

    expect(await screen.findByRole('navigation', { name: 'Hauptnavigation' })).toBeInTheDocument();
    expect(await screen.findByTestId('free-budget')).toHaveTextContent("CHF 4'172.08");
    expect(await db.settings.get('onboardingDone')).toMatchObject({ value: true });
    expect(await db.settings.get('onboardingInProgress')).toBeUndefined();
  });

  it('unterscheidet «Internet & TV» (📺) vom «Handy-Abo» (📱) und speichert das Symbol', async () => {
    const user = userEvent.setup();
    await renderApp('/', { onboarding: true });
    await user.click(screen.getByRole('button', { name: 'Überspringen' }));
    const suggestions = await screen.findByRole('list', { name: 'Vorschläge' });
    expect(within(suggestions).getByRole('button', { name: /Handy-Abo/ })).toHaveTextContent('📱');
    const tv = within(suggestions).getByRole('button', { name: /Internet & TV/ });
    expect(tv).toHaveTextContent('📺');

    await user.click(tv);
    const form = screen.getByRole('form', { name: 'Internet & TV erfassen' });
    await user.type(within(form).getByLabelText('Betrag (CHF)'), '79');
    await user.click(within(form).getByRole('button', { name: 'Hinzufügen' }));
    await waitFor(async () =>
      expect(await db.recurringExpenses.toArray()).toMatchObject([
        { name: 'Internet & TV', categoryId: 'fix-telefon', icon: '📺' },
      ]),
    );
  });

  it('lässt jeden Schritt überspringen', async () => {
    const user = userEvent.setup();
    await renderApp('/', { onboarding: true });
    await user.click(screen.getByRole('button', { name: 'Überspringen' }));
    expect(await screen.findByText('Schritt 2 von 3')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Überspringen' }));
    expect(await screen.findByText('Schritt 3 von 3')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: "Los geht's" }));
    expect(await screen.findByRole('link', { name: 'Einkommen erfassen' })).toBeInTheDocument();
  });

  it('lässt die ganze Einrichtung überspringen', async () => {
    const user = userEvent.setup();
    await renderApp('/', { onboarding: true });
    await user.click(screen.getByRole('button', { name: 'Einrichtung überspringen' }));
    expect(await screen.findByRole('navigation', { name: 'Hauptnavigation' })).toBeInTheDocument();
  });

  it('erscheint nicht, wenn bereits Daten vorhanden sind', async () => {
    await db.incomes.add({ id: 'i', name: 'Lohn', amount: 500000, interval: 'monthly' });
    await renderApp('/');
    expect(screen.queryByText(/Schritt 1 von 3/)).not.toBeInTheDocument();
  });
});
