import type { HealthResponse, StreamsResponse, LogsResponse, MetricsSummary, ConfigView, SafeDiagnosticsResponse } from '../../../shared/admin-api';

interface ApiClientOptions {
  baseUrl: string;
  authToken?: string;
}

export function createApiClient(options: ApiClientOptions) {
  const { baseUrl, authToken } = options;

  async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const res = await fetch(`${baseUrl}${path}`, {
      headers,
      credentials: 'include',
      signal,
    });

    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${res.statusText}`);
    }

    return res.json() as Promise<T>;
  }

  return {
    getHealth: (signal?: AbortSignal) => request<HealthResponse>('/api/health', signal),
    getStatus: (signal?: AbortSignal) => request<ServiceStatusResponse>('/api/status', signal),
    getStreams: (signal?: AbortSignal) => request<StreamsResponse>('/api/streams', signal),
    getLogs: (params: { lines?: number; level?: string; query?: string }, signal?: AbortSignal) => {
      const q = new URLSearchParams();
      if (params.lines) q.set('lines', String(params.lines));
      if (params.level) q.set('level', params.level);
      if (params.query) q.set('query', params.query);
      return request<LogsResponse>(`/api/logs?${q.toString()}`, signal);
    },
    getMetrics: (signal?: AbortSignal) => request<MetricsSummary>('/api/metrics', signal),
    getConfig: (signal?: AbortSignal) => request<ConfigView>('/api/config', signal),
    getDiagnostics: (signal?: AbortSignal) => request<SafeDiagnosticsResponse>('/api/diagnostics/safe-check', signal),
  };
}

interface ServiceStatusResponse {
  generatedAt: string;
  source: string;
  service: {
    unit: string;
    active: boolean;
    state: string;
    substate?: string;
    since?: string;
    uptimeSeconds?: number;
    version?: string;
  };
  warnings: string[];
}
