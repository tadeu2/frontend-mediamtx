import { readFile } from 'node:fs/promises';

import { FastifyPluginAsync } from 'fastify';

import type {
  ConfigView,
  HealthResponse,
  LogsResponse,
  MetricsSummary,
  ServiceStatusResponse,
  SafeDiagnosticsResponse,
  StreamPath,
  StreamsResponse
} from '../../../shared/admin-api';
import { redactConfigYaml } from '../services/config-redact';
import { readJournalLogs } from '../services/journal';
import { readSafeDiagnostics, readSystemdStatus } from '../services/systemd';
import { createMediaMTXClient } from '../services/mediamtx-api';
import { parsePrometheusMetrics } from '../services/metrics-parser';
import type { SettingsManager } from '../services/settings';

interface AdminRoutesOptions {
  settingsManager: SettingsManager;
  mediamtxMetricsUrl: string;
  mediamtxConfigPath: string;
}

function now() {
  return new Date().toISOString();
}

function mapPathStatus(item: { available?: boolean; online?: boolean }): StreamPath['status'] {
  if (item.available === false) return 'unavailable';
  if (item.online) return 'ready';
  return 'idle';
}

export const adminRoutes: FastifyPluginAsync<AdminRoutesOptions> = async (fastify, options) => {
  const { settingsManager } = options;

  fastify.get('/api/health', async (): Promise<HealthResponse> => ({
    ok: true,
    service: 'mediamtx-admin-ui',
    generatedAt: now(),
    source: 'fallback'
  }));

  fastify.get('/api/status', async (): Promise<ServiceStatusResponse> => {
    const [systemd, apiOk] = await Promise.all([
      readSystemdStatus(),
      createMTXClient().isAvailable(),
    ]);

    const warnings: string[] = [];
    if (systemd.state === 'unknown') warnings.push('systemctl unavailable; bounded fallback.');
    if (!apiOk) warnings.push('MediaMTX API unreachable');

    return {
      generatedAt: now(),
      source: systemd.state === 'unknown' ? 'unavailable' : 'systemd',
      service: systemd,
      warnings,
    };
  });

  fastify.get('/api/streams', async (): Promise<StreamsResponse> => {
    const mtx = createMTXClient();
    const data = await mtx.fetchPaths();
    if (data.itemCount === 0 && data.items.length === 0) {
      return { generatedAt: now(), source: 'unavailable', total: 0, items: [] };
    }

    const items: StreamPath[] = data.items.map((p) => ({
      name: p.name,
      status: mapPathStatus(p),
      updatedAt: now(),
    }));

    return {
      generatedAt: now(),
      source: 'api',
      total: items.length,
      items,
    };
  });

  fastify.get<{ Querystring: { lines?: string; level?: 'debug' | 'info' | 'warning' | 'error'; query?: string } }>(
    '/api/logs',
    async (request): Promise<LogsResponse> => {
      const parsedLines = request.query.lines ? Number.parseInt(request.query.lines, 10) : undefined;
      return readJournalLogs({
        lines: Number.isNaN(parsedLines) ? undefined : parsedLines,
        level: request.query.level,
        query: request.query.query
      });
    }
  );

  fastify.get('/api/metrics', async (): Promise<MetricsSummary> => {
    const s = settingsManager.get();
    const headers: Record<string, string> = {};
    if (s.mediamtxApiUsername && s.mediamtxApiPassword) {
      headers['Authorization'] = 'Basic ' + Buffer.from(`${s.mediamtxApiUsername}:${s.mediamtxApiPassword}`).toString('base64');
    }
    try {
      const response = await fetch(s.mediamtxMetricsUrl, { method: 'GET', headers });
      if (!response.ok) {
        throw new Error(`metrics_status_${response.status}`);
      }

      const responseText = await response.text();
      return parsePrometheusMetrics(responseText);
    } catch {
      return {
        generatedAt: now(),
        source: 'unavailable',
        available: false,
        totals: {},
        protocols: {},
        warnings: ['Metrics endpoint unavailable.']
      };
    }
  });

  fastify.get('/api/config', async (): Promise<ConfigView> => {
    const configPath = settingsManager.get().mediamtxConfigPath;
    try {
      const [content, apiCfg] = await Promise.all([
        readFile(configPath, 'utf8'),
        createMTXClient().fetchGlobalConfig(),
      ]);

      return {
        generatedAt: now(),
        source: 'config',
        available: true,
        path: configPath,
        redactedYaml: redactConfigYaml(content),
        flags: {
          apiEnabled: apiCfg.api !== undefined ? String(apiCfg.api) !== 'false' && String(apiCfg.api) !== 'no' : true,
          metricsEnabled: apiCfg.metrics !== undefined ? String(apiCfg.metrics) !== 'false' && String(apiCfg.metrics) !== 'no' : true,
          pprofEnabled: apiCfg.pprof !== undefined ? String(apiCfg.pprof) !== 'false' && String(apiCfg.pprof) !== 'no' : false,
        },
        warnings: [],
      };
    } catch {
      return {
        generatedAt: now(),
        source: 'unavailable',
        available: false,
        path: configPath,
        redactedYaml: '',
        flags: { apiEnabled: false, metricsEnabled: false, pprofEnabled: false },
        warnings: ['Configuration file unavailable.'],
      };
    }
  });

  fastify.get('/api/diagnostics/safe-check', async (): Promise<SafeDiagnosticsResponse> => {
    const [diag, apiOk] = await Promise.all([
      readSafeDiagnostics(),
      createMTXClient().isAvailable(),
    ]);

    const settings = settingsManager.getRedacted();
    return {
      ...diag,
      checks: [
        ...diag.checks,
        {
          id: 'mediamtx-api',
          label: 'MediaMTX API reachable',
          status: apiOk ? 'ok' : 'error',
          summary: apiOk
            ? 'MediaMTX API responds'
            : 'Cannot reach MediaMTX API. Check settings.',
        },
      ],
      warnings: apiOk ? diag.warnings : [...diag.warnings, 'MediaMTX API is not available.'],
    };
  });

  /* ── Helper: create client from current settings ── */
  function createMTXClient() {
    const s = settingsManager.get();
    return createMediaMTXClient(s.mediamtxApiUrl, s.mediamtxApiUsername, s.mediamtxApiPassword);
  }
};
