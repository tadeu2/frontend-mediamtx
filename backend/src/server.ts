import Fastify from 'fastify';

import { loadConfig } from './config';
import { authPlugin } from './plugins/auth';
import { corsPlugin } from './plugins/cors';
import { errorHandlerPlugin } from './plugins/error-handler';
import { adminRoutes } from './routes/admin';

export function buildServer() {
  const config = loadConfig();
  const app = Fastify({ logger: true });

  /* ── CORS (self-contained, can be encapsulated) ── */
  void app.register(corsPlugin, { origin: config.corsOrigin });

  /* ── Auth + error handler: apply directly to root scope
   * so hooks propagate to all child route scopes.
   * Fastify v5 register() creates sibling encapsulated
   * scopes — using register() for auth/errors silently
   * bypasses them on sibling routes.              ── */
  void authPlugin(app, { expectedToken: config.authToken });
  void errorHandlerPlugin(app, {});

  /* ── Routes inherit root-scope hooks ── */
  void app.register(adminRoutes, {
    mediamtxApiUrl: config.mediamtxApiUrl,
    mediamtxMetricsUrl: config.mediamtxMetricsUrl,
    mediamtxConfigPath: config.mediamtxConfigPath
  });

  app.get('/healthz', async () => {
    return {
      ok: true,
      service: 'mediamtx-admin-backend',
      generatedAt: new Date().toISOString()
    };
  });

  return { app, config };
}

async function main() {
  const { app, config } = buildServer();
  await app.listen({ host: config.host, port: config.port });
}

void main();
