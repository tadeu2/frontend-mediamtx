import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { loadConfig } from './config';
import { authPlugin } from './plugins/auth';
import { corsPlugin } from './plugins/cors';
import { errorHandlerPlugin } from './plugins/error-handler';
import { adminRoutes } from './routes/admin';
import { settingsRoutes } from './routes/settings';
import { SettingsManager } from './services/settings';

export function buildServer() {
  const config = loadConfig();
  const app = Fastify({ logger: true });
  const frontendDist = resolve(process.cwd(), '../frontend/dist');
  const frontendAssets = resolve(frontendDist, 'assets');

  /* ── Read-only settings status (env-based, no mutation) ── */
  const settingsManager = new SettingsManager(config);

  /* ── CORS (self-contained, can be encapsulated) ── */
  void app.register(corsPlugin, { origin: config.corsOrigin });

  /* ── Error handler on root scope (inherits to all children) ── */
  void errorHandlerPlugin(app, {});

  /* ── Auth scope: authPlugin + routes registered as children
   * so onRequest hooks and verifyAdminAuth decorator
   * propagate naturally via Fastify's register().  ── */
  void app.register(async function authScope(fastify) {
    void fastify.register(authPlugin, { expectedToken: config.authToken });
    void fastify.register(adminRoutes, { settingsManager, mediamtxMetricsUrl: config.mediamtxMetricsUrl, mediamtxConfigPath: config.mediamtxConfigPath });
    void fastify.register(settingsRoutes, { settingsManager });
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

  return { app, config, settingsManager };
}

async function main() {
  const { app, config } = buildServer();
  await app.listen({ host: config.host, port: config.port });
}

void main();
