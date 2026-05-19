import { createApiClient } from '../api/client';
import { ApiContext, PermissionsContext } from '../api/ApiContext';
import { MVP_PERMISSIONS } from '../config/permissions';
import { SidebarLayout } from '../layout/SidebarLayout';

const apiClient = createApiClient({ baseUrl: '' });

export function App() {
  return (
    <ApiContext.Provider value={apiClient}>
      <PermissionsContext.Provider value={MVP_PERMISSIONS}>
        <SidebarLayout />
      </PermissionsContext.Provider>
    </ApiContext.Provider>
  );
}
