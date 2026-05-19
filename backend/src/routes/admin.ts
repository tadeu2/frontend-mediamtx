import { readFile } from 'node:fs/promises';

import { FastifyPluginAsync } from 'fastify';

import type {
  ConfigView,
  HealthResponse,
  LogsResponse,
  MetricsSummary,
  SafeDiagnosticsResponse,
  ServiceStatus,
  StreamsResponse
} from '../../../shared/admin-api';
import { redactConfigYaml } from '../services/config-redact';
import { readJournalLogs } from '../services/journal';
import { readSafeDiagnostics, readSystemdStatus } from '../services/systemd';

interface AdminRoutesOptions {
  mediamtxApiUrl: string;
  mediamtxMetricsUrl: string;
  mediamtxConfigPath: string;
}

function now() {
  return new Date().toISOString();
}

export const adminRoutes: FastifyPluginAsync<AdminRoutesOptions> = async (fastify, options) => {
  fastify.get('/api/health', async (): Promise<HealthResponse> => ({
    ok: true,
    service: 'mediamtx-admin-ui',
    generatedAt: now(),
    source: 'fallback'
  }));

  fastify.get('/api/status', async (): Promise<{ generatedAt: string; source: string; service: ServiceStatus; warnings?: string[] }> => {
    const service = await readSystemdStatus();

    return {
      generatedAt: now(),
      source: service.state === 'unknown' ? 'unavailable' : 'systemd',
      service,
      warnings:
        service.state === 'unknown'
          ? ['systemctl unavailable; returning bounded fallback status.']
          : []
    };
  });

  fastify.get('/api/streams', async (): Promise<StreamsResponse> => ({
    generatedAt: now(),
    source: 'unavailable',
    total: 0,
    items: []
  }));

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
      const content = await readFile(options.mediamtxConfigPath, 'utf8');
      return {
        generatedAt: now(),
        source: 'config',
        available: true,
        path: options.mediamtxConfigPath,
        redactedYaml: redactConfigYaml(content),
        flags: {
          apiEnabled: true,
          metricsEnabled: true,
          pprofEnabled: false
        },
        warnings: []
      };
    } catch {
      return {
        generatedAt: now(),
        source: 'unavailable',
        available: false,
        path: options.mediamtxConfigPath,
        redactedYaml: '',
        flags: {
          apiEnabled: false,
          metricsEnabled: false,
          pprofEnabled: false
        },
        warnings: ['Configuration file unavailable.']
      };
    }
  });

  fastify.get('/api/diagnostics/safe-check', async (): Promise<SafeDiagnosticsResponse> => readSafeDiagnostics());
};
