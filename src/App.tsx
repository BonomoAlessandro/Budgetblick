import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { db } from './db/db';
import { deactivateEndedContracts } from './db/maintenance';
import { todayISO } from './lib/date';
import { SETTING_ONBOARDING_DONE, SETTING_ONBOARDING_IN_PROGRESS } from './lib/onboarding';
import { ContractsPage } from './pages/ContractsPage';
import { DashboardPage } from './pages/DashboardPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { FixedCostsPage } from './pages/FixedCostsPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { SettingsPage } from './pages/SettingsPage';

/** Assistent nur beim allerersten Start: nicht abgeschlossen und noch keine Daten erfasst. */
function useNeedsOnboarding(): boolean | undefined {
  return useLiveQuery(async () => {
    const done = await db.settings.get(SETTING_ONBOARDING_DONE);
    if (done?.value) return false;
    if ((await db.settings.get(SETTING_ONBOARDING_IN_PROGRESS))?.value) return true;
    const [incomes, recurring, expenses] = await Promise.all([
      db.incomes.count(),
      db.recurringExpenses.count(),
      db.expenses.count(),
    ]);
    return incomes + recurring + expenses === 0;
  }, []);
}

export default function App() {
  const needsOnboarding = useNeedsOnboarding();

  useEffect(() => {
    // Gekündigte Verträge nach Vertragsende automatisch aus den Fixkosten nehmen.
    void deactivateEndedContracts(todayISO());
  }, []);

  if (needsOnboarding === undefined) return null;
  if (needsOnboarding) return <OnboardingPage />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="fixkosten" element={<FixedCostsPage />} />
        <Route path="vertraege" element={<ContractsPage />} />
        <Route path="ausgaben" element={<ExpensesPage />} />
        <Route path="einstellungen" element={<SettingsPage />} />
        <Route path="*" element={<DashboardPage />} />
      </Route>
    </Routes>
  );
}
