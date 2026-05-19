import Fastify from 'fastify';

import { loadConfig } from './config';
import { authPlugin } from './plugins/auth';
import { corsPlugin } from './plugins/cors';
import { errorHandlerPlugin } from './plugins/error-handler';
import { adminRoutes } from './routes/admin';

export function buildServer() {
  const config = loadConfig();
  const app = Fastify({ logger: true });

  void app.register(corsPlugin, { origin: config.corsOrigin });
  void app.register(errorHandlerPlugin);
  void app.register(authPlugin, { expectedToken: config.authToken });
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
