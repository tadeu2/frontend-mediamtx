import { AuthProvider, useAuth } from '../api/AuthContext';
import { createApiClient } from '../api/client';
import { ApiContext, PermissionsContext } from '../api/ApiContext';
import { MVP_PERMISSIONS } from '../config/permissions';
import { SidebarLayout } from '../layout/SidebarLayout';
import { Login } from '../pages/Login';

const apiClient = createApiClient({ baseUrl: '' });

function AppShell() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <ApiContext.Provider value={apiClient}>
      <PermissionsContext.Provider value={MVP_PERMISSIONS}>
        <SidebarLayout />
      </PermissionsContext.Provider>
    </ApiContext.Provider>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
