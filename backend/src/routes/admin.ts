import { readFile } from 'node:fs/promises';

import { FastifyPluginAsync } from 'fastify';

import type {
  ConfigView,
  HealthResponse,
  LogsResponse,
  MetricsSummary,
  SafeDiagnosticsResponse,
  ServiceStatus,
  StreamPath,
  StreamsResponse
} from '../../../shared/admin-api';
import { redactConfigYaml } from '../services/config-redact';
import { readJournalLogs } from '../services/journal';
import { readSafeDiagnostics, readSystemdStatus } from '../services/systemd';
import { createMediaMTXClient } from '../services/mediamtx-api';

interface AdminRoutesOptions {
  mediamtxApiUrl: string;
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
  const mtx = createMediaMTXClient(options.mediamtxApiUrl);

  fastify.get('/api/health', async (): Promise<HealthResponse> => ({
    ok: true,
    service: 'mediamtx-admin-ui',
    generatedAt: now(),
    source: 'fallback'
  }));

  fastify.get('/api/status', async (): Promise<{ generatedAt: string; source: string; service: ServiceStatus; warnings?: string[] }> => {
    const [systemd, apiOk] = await Promise.all([
      readSystemdStatus(),
      mtx.isAvailable(),
    ]);

    const warnings: string[] = [];
    if (systemd.state === 'unknown') warnings.push('systemctl unavailable; bounded fallback.');
    if (!apiOk) warnings.push('MediaMTX API unreachable at ' + options.mediamtxApiUrl);

    return {
      generatedAt: now(),
      source: systemd.state === 'unknown' ? 'unavailable' : 'systemd',
      service: systemd,
      warnings,
    };
  });

  fastify.get('/api/streams', async (): Promise<StreamsResponse> => {
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
    try {
      const response = await fetch(options.mediamtxMetricsUrl, { method: 'GET' });
      if (!response.ok) {
        throw new Error(`metrics_status_${response.status}`);
      }

      return {
        generatedAt: now(),
        source: 'metrics',
        available: true,
        totals: {},
        protocols: {},
        warnings: ['Metrics parser not implemented yet; raw availability only.']
      };
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
    try {
      const [content, apiCfg] = await Promise.all([
        readFile(options.mediamtxConfigPath, 'utf8'),
        mtx.fetchGlobalConfig(),
      ]);

      return {
        generatedAt: now(),
        source: 'config',
        available: true,
        path: options.mediamtxConfigPath,
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
        path: options.mediamtxConfigPath,
        redactedYaml: '',
        flags: { apiEnabled: false, metricsEnabled: false, pprofEnabled: false },
        warnings: ['Configuration file unavailable.'],
      };
    }
  });

  fastify.get('/api/diagnostics/safe-check', async (): Promise<SafeDiagnosticsResponse> => {
    const [diag, apiOk] = await Promise.all([
      readSafeDiagnostics(),
      mtx.isAvailable(),
    ]);

    return {
      ...diag,
      checks: [
        ...diag.checks,
        {
          id: 'mediamtx-api',
          label: 'MediaMTX API reachable',
          status: apiOk ? 'ok' : 'error',
          summary: apiOk
            ? 'MediaMTX API responds at ' + options.mediamtxApiUrl
            : 'Cannot reach ' + options.mediamtxApiUrl,
        },
      ],
      warnings: apiOk ? diag.warnings : [...diag.warnings, 'MediaMTX API is not available.'],
    };
  });
};
