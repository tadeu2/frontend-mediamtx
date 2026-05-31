import { FastifyPluginAsync } from 'fastify';
import type { SettingsStatusResponse } from '../../../shared/admin-api';
import type { SettingsManager } from '../services/settings';

interface SettingsRoutesOptions {
  settingsManager: SettingsManager;
}

export const settingsRoutes: FastifyPluginAsync<SettingsRoutesOptions> = async (fastify, options) => {
  const { settingsManager } = options;

  /**
   * GET /api/settings — read-only config status.
   *
   * Returns the current effective configuration with:
   * - Secrets excluded (no passwords, tokens, usernames)
   * - URLs sanitised (userinfo stripped)
   * - Boolean flags for configuration status
   * - Reachability status for external services
   *
   * This endpoint does NOT expose editable settings.
   * All configuration is managed via backend/.env.
   */
  fastify.get('/api/settings', async (): Promise<SettingsStatusResponse> => {
    return settingsManager.getStatus();
  });
};
