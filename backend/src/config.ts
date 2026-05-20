export interface AppConfig {
  host: string;
  port: number;
  mediamtxApiUrl: string;
  mediamtxApiUsername?: string;
  mediamtxApiPassword?: string;
  mediamtxMetricsUrl: string;
  mediamtxConfigPath: string;
  authToken?: string;
  corsOrigin: string;
}

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 9088;
const DEFAULT_MEDIAMTX_API_URL = 'http://127.0.0.1:9997';
const DEFAULT_MEDIAMTX_METRICS_URL = 'http://127.0.0.1:9998/metrics';
const DEFAULT_MEDIAMTX_CONFIG_PATH = '/etc/mediamtx/mediamtx.yml';

function toInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    host: env.BIND_ADDRESS ?? DEFAULT_HOST,
    port: toInt(env.PORT, DEFAULT_PORT),
    mediamtxApiUrl: env.MEDIAMTX_API_URL ?? DEFAULT_MEDIAMTX_API_URL,
    mediamtxApiUsername: env.MEDIAMTX_API_USERNAME,
    mediamtxApiPassword: env.MEDIAMTX_API_PASSWORD,
    mediamtxMetricsUrl: env.MEDIAMTX_METRICS_URL ?? DEFAULT_MEDIAMTX_METRICS_URL,
    mediamtxConfigPath: env.MEDIAMTX_CONFIG_PATH ?? DEFAULT_MEDIAMTX_CONFIG_PATH,
    authToken: env.ADMIN_AUTH_TOKEN,
    corsOrigin: env.CORS_ORIGIN ?? '*'
  };
}
