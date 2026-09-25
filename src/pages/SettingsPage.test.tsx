import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db/db';
import { SETTING_ENTRY_CATEGORY_ORDER } from '../db/hooks';
import { BACKUP_FORMAT } from '../lib/backup';
import { renderApp, resetDb } from '../test/utils';

beforeEach(() => resetDb());
afterEach(() => {
  vi.restoreAllMocks();
  document.documentElement.classList.remove('dark');
  localStorage.clear();
});

async function openSettings() {
  const user = userEvent.setup();
  await renderApp('/einstellungen');
  await screen.findAllByText('Lebensmittel');
  return user;
}

describe('Einstellungen', () => {
  it('wechselt das Farbschema und merkt es sich', async () => {
    const user = await openSettings();
    await user.click(screen.getByRole('radio', { name: 'Dunkel' }));
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('budgetblick-theme')).toBe('dark');
    await user.click(screen.getByRole('radio', { name: 'Hell' }));
    expect(document.documentElement).not.toHaveClass('dark');
    await user.click(screen.getByRole('radio', { name: 'System' }));
    expect(localStorage.getItem('budgetblick-theme')).toBeNull();
  });

  it('speichert die Standard-Vorlaufzeit', async () => {
    const user = await openSettings();
    const input = screen.getByLabelText(/Standard-Vorlaufzeit/);
    expect(input).toHaveValue('14');
    await user.clear(input);
    await user.type(input, '30');
    await user.click(screen.getByRole('button', { name: 'Speichern' }));
    await waitFor(async () => expect((await db.settings.get('reminderLeadDays'))?.value).toBe(30));
  });

  it('zeigt variable Kategorien in der Reihenfolge beim Erfassen, mit Griff zum Ziehen', async () => {
    // Ziehen selbst braucht echte Layout-Positionen (im Browser geprüft); hier: Anzeige und Zurücksetzen
    await db.settings.put({
      key: SETTING_ENTRY_CATEGORY_ORDER,
      value: ['var-sonstiges', 'var-reisen'],
    });
    const user = await openSettings();
    const card = screen.getByRole('heading', { name: 'Kategorien · Variabel' }).closest('section')!;
    const order = () =>
      within(card)
        .getAllByRole('listitem')
        .map((li) => li.querySelector('.truncate')?.textContent);
    await waitFor(() =>
      expect(order().slice(0, 3)).toEqual(['Sonstiges', 'Reisen', 'Lebensmittel']),
    );

    // Griff pro Zeile, keine Pfeil-Knöpfe; Antippen des Namens bleibt die Bearbeitung
    expect(within(card).getAllByRole('button', { name: /verschieben$/ })).toHaveLength(7);
    expect(within(card).getByRole('button', { name: 'Reisen verschieben' })).toHaveAttribute(
      'aria-describedby',
    );
    expect(within(card).queryByRole('button', { name: /nach oben/ })).toBeNull();
    expect(within(card).getByRole('button', { name: 'Reisen' })).toBeInTheDocument();
    // Fixkosten lassen sich nicht umsortieren
    const fixedCard = screen
      .getByRole('heading', { name: 'Kategorien · Fixkosten' })
      .closest('section')!;
    expect(within(fixedCard).queryByRole('button', { name: /verschieben$/ })).toBeNull();

    await user.click(
      within(card).getByRole('button', { name: 'Standardreihenfolge wiederherstellen' }),
    );
    await waitFor(() =>
      expect(order().slice(0, 3)).toEqual(['Lebensmittel', 'Restaurant & Café', 'Freizeit']),
    );
  });

  it('legt Kategorien an, bearbeitet sie und schützt verwendete vor dem Löschen', async () => {
    await db.expenses.add({
      id: 'e',
      amount: 100,
      date: '2026-09-01',
      categoryId: 'var-freizeit',
      source: 'manual',
    });
    const user = await openSettings();

    const variable = screen
      .getByRole('heading', { name: 'Kategorien · Variabel' })
      .closest('section')!;
    await user.click(within(variable).getByRole('button', { name: 'Neue Kategorie' }));
    let dialog = await screen.findByRole('dialog', { name: 'Neue Kategorie' });
    await user.type(within(dialog).getByLabelText('Name'), 'Haustier');
    await user.clear(within(dialog).getByLabelText('Symbol (Emoji)'));
    await user.type(within(dialog).getByLabelText('Symbol (Emoji)'), '🐕');
    await user.click(within(dialog).getByRole('button', { name: 'Speichern' }));
    expect(await within(variable).findByRole('button', { name: 'Haustier' })).toBeInTheDocument();
    expect(await db.categories.where('name').equals('Haustier').first()).toMatchObject({
      kind: 'variable',
      icon: '🐕',
    });

    // Verwendete Kategorie kann nicht gelöscht werden
    await user.click(within(variable).getByRole('button', { name: 'Freizeit' }));
    dialog = await screen.findByRole('dialog', { name: 'Kategorie bearbeiten' });
    expect(await within(dialog).findByText(/Wird von 1 Eintrag verwendet/)).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Löschen' })).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Schliessen' }));

    // Unbenutzte Kategorie löschen
    await user.click(within(variable).getByRole('button', { name: 'Haustier' }));
    dialog = await screen.findByRole('dialog', { name: 'Kategorie bearbeiten' });
    await user.click(await within(dialog).findByRole('button', { name: 'Löschen' }));
    await user.click(within(dialog).getByRole('button', { name: 'Wirklich löschen' }));
    await waitFor(() =>
      expect(within(variable).queryByRole('button', { name: /Haustier/ })).not.toBeInTheDocument(),
    );
  });

  it('exportiert alle Daten als JSON', async () => {
    await db.incomes.add({ id: 'i', name: 'Lohn', amount: 650000, interval: 'monthly' });
    const createObjectURL = vi.fn((blob: Blob) => {
      void blob;
      return 'blob:x';
    });
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }));
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const user = await openSettings();
    await user.click(screen.getByRole('button', { name: 'Daten exportieren (JSON)' }));
    await waitFor(() => expect(createObjectURL).toHaveBeenCalled());
    const json = JSON.parse(await createObjectURL.mock.calls[0]![0].text());
    expect(json.format).toBe(BACKUP_FORMAT);
    expect(json.data.incomes).toEqual([
      { id: 'i', name: 'Lohn', amount: 650000, interval: 'monthly' },
    ]);
    expect(await screen.findByText('Sicherung wurde heruntergeladen.')).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it('importiert eine Sicherung nach Bestätigung', async () => {
    await db.incomes.add({ id: 'alt', name: 'Alt', amount: 1, interval: 'monthly' });
    const backup = {
      format: BACKUP_FORMAT,
      version: 1,
      exportedAt: '2026-09-01T08:00:00.000Z',
      data: {
        categories: await db.categories.toArray(),
        incomes: [{ id: 'neu', name: 'Lohn', amount: 700000, interval: 'monthly' }],
        recurringExpenses: [],
        expenses: [],
        settings: [{ key: 'onboardingDone', value: true }],
      },
    };
    const user = await openSettings();
    const file = new File([JSON.stringify(backup)], 'sicherung.json', { type: 'application/json' });
    await user.upload(screen.getByLabelText('Daten importieren'), file);

    const dialog = await screen.findByRole('dialog', { name: 'Sicherung importieren' });
    expect(dialog).toHaveTextContent('Sicherung vom 01.09.2026 mit 0 Fixkosten und 0 Ausgaben');
    await user.click(within(dialog).getByRole('button', { name: 'Daten ersetzen' }));

    expect(await screen.findByText('Sicherung wurde importiert.')).toBeInTheDocument();
    expect(await db.incomes.toArray()).toEqual([
      { id: 'neu', name: 'Lohn', amount: 700000, interval: 'monthly' },
    ]);
  });

  it('meldet ungültige Dateien, ohne Daten zu ändern', async () => {
    await db.incomes.add({ id: 'i', name: 'Lohn', amount: 650000, interval: 'monthly' });
    const user = await openSettings();
    await user.upload(
      screen.getByLabelText('Daten importieren'),
      new File(['{"foo": 1}'], 'x.json', { type: 'application/json' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('keine Budgetblick-Sicherung');
    await user.upload(
      screen.getByLabelText('Daten importieren'),
      new File(['kein json'], 'x.json', { type: 'application/json' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('konnte nicht gelesen werden');
    expect(await db.incomes.count()).toBe(1);
  });

  it('löscht alle Daten nach Bestätigung und startet den Assistenten neu', async () => {
    await db.incomes.add({ id: 'i', name: 'Lohn', amount: 650000, interval: 'monthly' });
    const user = await openSettings();
    await user.click(screen.getByRole('button', { name: 'Alle Daten löschen' }));
    const dialog = await screen.findByRole('dialog', { name: 'Alle Daten löschen?' });
    await user.click(within(dialog).getByRole('button', { name: 'Endgültig löschen' }));
    expect(await screen.findByText('Schritt 1 von 3')).toBeInTheDocument();
    expect(await db.incomes.count()).toBe(0);
    expect(await db.categories.count()).toBe(14);
  });
});

describe('Hinweis Krankenkassenwechsel', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 15, 10, 0));
    await db.recurringExpenses.add({
      id: 'kk',
      name: 'Grundversicherung',
      amount: 42000,
      interval: 'monthly',
      nextDueDate: '2026-11-01',
      categoryId: 'fix-krankenkasse',
      active: true,
    });
  });
  afterEach(() => vi.useRealTimers());

  it('erscheint im Oktober und lässt sich für dieses Jahr ausblenden', async () => {
    const user = userEvent.setup();
    await renderApp('/');
    const hint = await screen.findByRole('complementary', { name: 'Hinweis Krankenkassenwechsel' });
    expect(hint).toHaveTextContent('Kündigung der Grundversicherung bis 30. November möglich');
    await user.click(within(hint).getByRole('button', { name: /ausblenden/ }));
    await waitFor(() =>
      expect(
        screen.queryByRole('complementary', { name: 'Hinweis Krankenkassenwechsel' }),
      ).not.toBeInTheDocument(),
    );
    expect((await db.settings.get('healthInsuranceHintDismissedYear'))?.value).toBe(2026);
  });
});
