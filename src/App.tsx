import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { deactivateEndedContracts } from './db/maintenance';
import { todayISO } from './lib/date';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { FixedCostsPage } from './pages/FixedCostsPage';
import { ContractsPage } from './pages/ContractsPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  useEffect(() => {
    // Gekündigte Verträge nach Vertragsende automatisch aus den Fixkosten nehmen.
    void deactivateEndedContracts(todayISO());
  }, []);

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
