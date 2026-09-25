import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { FixedCostsPage } from './pages/FixedCostsPage';
import { ContractsPage } from './pages/ContractsPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
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
