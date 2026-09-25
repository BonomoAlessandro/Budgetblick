/**
 * Farbschema (Hell/Dunkel/System). Wird pro Gerät im localStorage gespeichert,
 * damit es schon vor dem ersten Rendern feststeht (siehe Skript in index.html).
 */

export type Theme = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'budgetblick-theme';

export const THEME_LABELS: Record<Theme, string> = {
  system: 'System',
  light: 'Hell',
  dark: 'Dunkel',
};

export function getTheme(): Theme {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

function prefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function applyTheme(theme: Theme = getTheme()): void {
  const dark = theme === 'dark' || (theme === 'system' && prefersDark());
  document.documentElement.classList.toggle('dark', dark);
}

export function setTheme(theme: Theme): void {
  try {
    if (theme === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Privater Modus o. Ä.: Einstellung gilt dann nur für diese Sitzung.
  }
  applyTheme(theme);
}

/** Wendet das Schema an und folgt Änderungen der Systemeinstellung. */
export function initTheme(): void {
  applyTheme();
  window
    .matchMedia?.('(prefers-color-scheme: dark)')
    .addEventListener?.('change', () => applyTheme());
}
