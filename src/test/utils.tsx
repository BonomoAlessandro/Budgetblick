import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { db } from '../db/db';
import { SETTING_ONBOARDING_DONE } from '../lib/onboarding';

/**
 * Setzt die globale Datenbank zurück (Standardkategorien werden neu angelegt).
 * Standardmässig gilt der Einrichtungs-Assistent als abgeschlossen.
 */
export async function resetDb({ onboarding = false } = {}): Promise<void> {
  db.close();
  await db.delete();
  await db.open();
  if (!onboarding) await db.settings.put({ key: SETTING_ONBOARDING_DONE, value: true });
}

/** Rendert die App und wartet, bis sie bereit ist (Navigation bzw. Assistent sichtbar). */
export async function renderApp(path = '/', { onboarding = false } = {}) {
  const result = render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
  if (onboarding) await screen.findByText(/Schritt 1 von 3/);
  else await screen.findByRole('navigation', { name: 'Hauptnavigation' });
  return result;
}
