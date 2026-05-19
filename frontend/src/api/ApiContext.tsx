import { createContext, useContext } from 'react';
import { createApiClient } from './client';
import type { AllowedActions } from '../config/permissions';
import { MVP_PERMISSIONS } from '../config/permissions';

export type ApiClient = ReturnType<typeof createApiClient>;

export const ApiContext = createContext<ApiClient | null>(null);

export function useApi(): ApiClient {
  const ctx = useContext(ApiContext);
  if (!ctx) {
    throw new Error('useApi must be used within an ApiContext.Provider');
  }
  return ctx;
}

/* ---- Permissions context (mutation gate) ---- */

export const PermissionsContext = createContext<AllowedActions>(MVP_PERMISSIONS);

export function usePermissions(): AllowedActions {
  return useContext(PermissionsContext);
}
