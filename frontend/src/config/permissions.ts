/**
 * Allowed mutation/admin actions.
 *
 * Each boolean flag gates a specific mutation capability.
 * In the MVP, ALL flags are `false` — no mutations are permitted.
 *
 * To enable a mutation path in a future release:
 *  1. Add the corresponding backend route
 *  2. Set the flag to `true` here
 *  3. The UI will automatically show the action in the sidebar
 */
export interface AllowedActions {
  /** Restart the MediaMTX service via systemd */
  readonly canRestart: boolean;
  /** Reload MediaMTX configuration without restarting */
  readonly canReload: boolean;
  /** Edit and save configuration through the UI */
  readonly canEditConfig: boolean;
}

/** MVP permissions: all mutation actions are DISABLED. */
export const MVP_PERMISSIONS: AllowedActions = {
  canRestart: false,
  canReload: false,
  canEditConfig: false,
};

/** Returns `true` when at least one admin action is allowed. */
export function hasAnyAdminAction(p: AllowedActions): boolean {
  return p.canRestart || p.canReload || p.canEditConfig;
}

/** Stable list of all admin nav items keyed by permission flag. */
export interface AdminNavItem {
  route: string;
  label: string;
  permission: keyof AllowedActions;
}

export const ADMIN_ITEMS: AdminNavItem[] = [
  { route: 'admin/restart', label: 'Restart Service', permission: 'canRestart' },
  { route: 'admin/reload', label: 'Reload Config', permission: 'canReload' },
  { route: 'admin/edit-config', label: 'Edit Config', permission: 'canEditConfig' },
];
