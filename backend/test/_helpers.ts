import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

import { loadConfig } from '../src/config';
import { authPlugin } from '../src/plugins/auth';
import { corsPlugin } from '../src/plugins/cors';
import { errorHandlerPlugin } from '../src/plugins/error-handler';
import { adminRoutes } from '../src/routes/admin';
import { SettingsManager } from '../src/services/settings';

/**
 * Build a test Fastify instance with optional auth token configuration.
 *
 * Does NOT import `server.ts` to avoid triggering the top-level `main()`
 * side-effect that starts a real listener on port 9088.
 *
 * Calls auth/error plugins as PLAIN FUNCTIONS (not through `app.register()`)
 * so cross-cutting hooks apply to all route scopes. Production follows the
 * same pattern after the Fastify v5 encapsulation fix.
 *
 * Environment manipulation is serialized per-call so callers MUST serialize
 * their test-file-level builds (use --test-concurrency=1).
 */
export async function createTestServer(options?: {
  authToken?: string;
}): Promise<FastifyInstance> {
  const originalToken = process.env.ADMIN_AUTH_TOKEN;

  try {
    if (options?.authToken) {
      process.env.ADMIN_AUTH_TOKEN = options.authToken;
    } else {
      delete process.env.ADMIN_AUTH_TOKEN;
    }

    const config = loadConfig();
    const app = Fastify({ logger: false });

    // Call plugins as plain functions — scopes share the root `app` so
    // addHook / setErrorHandler inside plugins apply to all routes.
    await corsPlugin(app, { origin: config.corsOrigin });
    await errorHandlerPlugin(app);
    await authPlugin(app, { expectedToken: config.authToken });
    const settingsManager = new SettingsManager(undefined, {
      mediamtxApiUrl: config.mediamtxApiUrl,
      mediamtxApiUsername: '',
      mediamtxApiPassword: '',
      mediamtxMetricsUrl: config.mediamtxMetricsUrl,
      mediamtxConfigPath: config.mediamtxConfigPath,
    });
    await adminRoutes(app, {
      settingsManager,
      mediamtxMetricsUrl: config.mediamtxMetricsUrl,
      mediamtxConfigPath: config.mediamtxConfigPath
    });

    // /healthz is defined in server.ts; replicate it for tests
    app.get('/healthz', async () => ({
      ok: true,
      service: 'mediamtx-admin-backend',
      generatedAt: new Date().toISOString()
    }));

    await app.ready();
    return app;
  } finally {
    if (originalToken !== undefined) {
      process.env.ADMIN_AUTH_TOKEN = originalToken;
    } else {
      delete process.env.ADMIN_AUTH_TOKEN;
    }
  }
}
