import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminLayout from './components/AdminLayout';
import DashboardOverview from './components/DashboardOverview';
import UsersManager from './components/UsersManager';
import CampaignsManager from './components/CampaignsManager';
import EventsManager from './components/EventsManager';
import AuditLogsManager from './components/AuditLogsManager';
import ManagerLayout from './layouts/ManagerLayout';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import ManagerCampaigns from './pages/manager/ManagerCampaigns';
import ManagerCampaignDetails from './pages/manager/ManagerCampaignDetails';
import ManagerSecurityEvents from './pages/manager/ManagerSecurityEvents';
import UserLayout from './layouts/UserLayout';
import UserDashboard from './pages/user/UserDashboard';
import UserCampaigns from './pages/user/UserCampaigns';
import UserCampaignDetails from './pages/user/UserCampaignDetails';

// Helper component to route logged-in users to their role-specific dashboard
const RoleDashboardRedirect = () => {
  const { role } = useAuth();
  const userRole = role ? role.toUpperCase() : 'USER';

  if (userRole === 'ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  } else if (userRole === 'MANAGER') {
    return <Navigate to="/manager/dashboard" replace />;
  } else {
    return <Navigate to="/user/dashboard" replace />;
  }
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Root Role-Based Dashboard Dispatcher */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<RoleDashboardRedirect />} />
          </Route>

          {/* ADMIN Role Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardOverview />} />
              <Route path="users" element={<UsersManager />} />
              <Route path="campaigns" element={<CampaignsManager />} />
              <Route path="events" element={<EventsManager />} />
              <Route path="audit-logs" element={<AuditLogsManager />} />
            </Route>
          </Route>

          {/* MANAGER Role Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['MANAGER']} />}>
            <Route path="/manager" element={<ManagerLayout />}>
              <Route index element={<Navigate to="/manager/dashboard" replace />} />
              <Route path="dashboard" element={<ManagerDashboard />} />
              <Route path="campaigns" element={<ManagerCampaigns />} />
              <Route path="campaigns/:id" element={<ManagerCampaignDetails />} />
              <Route path="security-events" element={<ManagerSecurityEvents />} />
            </Route>
          </Route>

          {/* USER Role Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['USER']} />}>
            <Route path="/user" element={<UserLayout />}>
              <Route index element={<Navigate to="/user/dashboard" replace />} />
              <Route path="dashboard" element={<UserDashboard />} />
              <Route path="campaigns" element={<UserCampaigns />} />
              <Route path="campaigns/:id" element={<UserCampaignDetails />} />
            </Route>
          </Route>

          {/* Fallback Redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
