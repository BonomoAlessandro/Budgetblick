import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetDb } from './test/utils';
import App from './App';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

beforeEach(() => resetDb());

describe('Navigation', () => {
  it('zeigt die vier Tabs und den Erfassen-Button', async () => {
    renderAt('/');
    const nav = await screen.findByRole('navigation', { name: 'Hauptnavigation' });
    for (const label of ['Übersicht', 'Fixkosten', 'Verträge', 'Ausgaben']) {
      expect(nav).toHaveTextContent(label);
    }
    expect(screen.getByRole('button', { name: 'Ausgabe erfassen' })).toBeInTheDocument();
  });

  it('wechselt per Tab zwischen den Bildschirmen', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.click(await screen.findByRole('link', { name: 'Fixkosten' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Fixkosten' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Fixkosten' })).toHaveAttribute('aria-current', 'page');

    await user.click(screen.getByRole('link', { name: 'Verträge' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Verträge' })).toBeInTheDocument();
  });

  it('öffnet die Einstellungen über das Zahnrad und zeigt die Kategorien', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.click(await screen.findByRole('link', { name: 'Einstellungen' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Einstellungen' })).toBeInTheDocument();
    expect((await screen.findAllByText('Lebensmittel')).length).toBeGreaterThan(0);
    expect(screen.getByText('Krankenkasse')).toBeInTheDocument();
  });
});
