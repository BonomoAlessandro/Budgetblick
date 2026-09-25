import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { db } from '../db/db';

/** Setzt die globale Datenbank zurück (Standardkategorien werden neu angelegt). */
export async function resetDb(): Promise<void> {
  db.close();
  await db.delete();
  await db.open();
}

export function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}
