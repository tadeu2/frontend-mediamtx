import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { loadConfig } from './config';
import { authPlugin } from './plugins/auth';
import { corsPlugin } from './plugins/cors';
import { errorHandlerPlugin } from './plugins/error-handler';
import { adminRoutes } from './routes/admin';

export function buildServer() {
  const config = loadConfig();
  const app = Fastify({ logger: true });
  const frontendDist = resolve(process.cwd(), '../frontend/dist');
  const frontendAssets = resolve(frontendDist, 'assets');

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
    mediamtxApiUsername: config.mediamtxApiUsername,
    mediamtxApiPassword: config.mediamtxApiPassword,
    mediamtxMetricsUrl: config.mediamtxMetricsUrl,
    mediamtxConfigPath: config.mediamtxConfigPath
  });

  if (existsSync(frontendDist) && existsSync(frontendAssets)) {
    void app.register(fastifyStatic, {
      root: frontendAssets,
      prefix: '/assets/',
      immutable: true,
      maxAge: '30d'
    });

    app.get('/', async (_request, reply) => {
      reply.header('Cache-Control', 'no-store');
      return reply.sendFile('index.html', frontendDist);
    });
  }

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
