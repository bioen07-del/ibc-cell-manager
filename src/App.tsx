import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './components/LoginPage';
import { Dashboard } from './modules/Dashboard';
import { DonorsPage } from './modules/donors/DonorsPage';
import { DonationsPage } from './modules/donations/DonationsPage';
import { CulturesPage } from './modules/cultures/CulturesPage';
import { TasksPage } from './modules/tasks/TasksPage';
import { MasterBanksPage } from './modules/masterbanks/MasterBanksPage';
import { StoragePage } from './modules/storage/StoragePage';
import { ReleasesPage } from './modules/releases/ReleasesPage';
import { DisposalsPage } from './modules/disposals/DisposalsPage';
import { EquipmentPage } from './modules/equipment/EquipmentPage';
import { MediaPage } from './modules/media/MediaPage';
import { AdminPage } from './modules/admin/AdminPage';
import { AutoTasksSettingsPage } from './modules/autotasks/AutoTasksSettingsPage';
import { ContainersPage } from './modules/containers/ContainersPage';
import { ResourcesPage } from './modules/resources/ResourcesPage';
import SOPsPage from './modules/sops/SOPsPage';
import { CalendarPage } from './modules/calendar/CalendarPage';
import { AuditPage } from './modules/audit/AuditPage';
import FeedbackPage from './modules/admin/FeedbackPage';

const ProtectedApp: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="donors" element={<DonorsPage />} />
          <Route path="donations" element={<DonationsPage />} />
          <Route path="cultures" element={<CulturesPage />} />
          <Route path="masterbanks" element={<MasterBanksPage />} />
          <Route path="storage" element={<StoragePage />} />
          <Route path="releases" element={<ReleasesPage />} />
          <Route path="disposals" element={<DisposalsPage />} />
          <Route path="equipment" element={<EquipmentPage />} />
          <Route path="media" element={<MediaPage />} />
          <Route path="resources" element={<ResourcesPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="autotasks" element={<AutoTasksSettingsPage />} />
          <Route path="sops" element={<SOPsPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="containers" element={<ContainersPage />} />
          <Route path="audit" element={<AuditPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="admin/feedback" element={<FeedbackPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppProvider>
        <ProtectedApp />
      </AppProvider>
    </AuthProvider>
  );
};

export default App;
