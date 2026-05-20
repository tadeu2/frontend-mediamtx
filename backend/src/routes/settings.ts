import { FastifyPluginAsync } from 'fastify';
import type { SettingsManager } from '../services/settings';

interface SettingsRoutesOptions {
  settingsManager: SettingsManager;
}

function now() {
  return new Date().toISOString();
}

export const settingsRoutes: FastifyPluginAsync<SettingsRoutesOptions> = async (fastify, options) => {
  const { settingsManager } = options;

  fastify.get('/api/settings', async () => ({
    generatedAt: now(),
    source: 'settings',
    settings: settingsManager.getRedacted(),
  }));

  fastify.patch<{ Body: Record<string, string | undefined> }>('/api/settings', async (request) => {
    const allowedKeys = [
      'mediamtxApiUrl',
      'mediamtxApiUsername',
      'mediamtxApiPassword',
      'mediamtxMetricsUrl',
      'mediamtxConfigPath',
    ];

    const partial: Record<string, string | undefined> = {};
    for (const key of allowedKeys) {
      if (request.body?.[key] !== undefined) {
        partial[key] = String(request.body[key]);
      }
    }

    const updated = await settingsManager.update(partial);
    return { generatedAt: now(), source: 'settings', settings: updated };
  });
};
