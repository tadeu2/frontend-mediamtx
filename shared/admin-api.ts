export type ISO8601String = string;

export type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'unknown';
export type DataSource = 'api' | 'metrics' | 'journalctl' | 'config' | 'systemd' | 'fallback' | 'unavailable';

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface HealthResponse {
  ok: true;
  service: 'mediamtx-admin-ui';
  generatedAt: ISO8601String;
  source: DataSource;
}

export interface ServiceStatus {
  unit: string;
  active: boolean;
  state: string;
  substate?: string;
  since?: ISO8601String;
  uptimeSeconds?: number;
  version?: string;
}

export interface ServiceStatusResponse {
  generatedAt: ISO8601String;
  source: DataSource;
  service: ServiceStatus;
  warnings: string[];
}

export interface SettingsStatusResponse {
  generatedAt: ISO8601String;
  bindAddress: string;
  port: number;
  mediamtxApiUrl: string;
  mediamtxMetricsUrl: string;
  mediamtxConfigPath: string;
  authEnabled: boolean;
  mediamtxApiUsernameConfigured: boolean;
  mediamtxApiPasswordConfigured: boolean;
  adminAuthTokenConfigured: boolean;
  mediamtxApiReachable: boolean;
  metricsReachable: boolean;
}

export interface StreamPath {
  name: string;
  status: 'ready' | 'idle' | 'unavailable' | 'unknown';
  protocol?: string;
  readers?: number;
  publishers?: number;
  bytesReceived?: number;
  bytesSent?: number;
  updatedAt?: ISO8601String;
}

export interface StreamsResponse {
  generatedAt: ISO8601String;
  source: DataSource;
  total: number;
  items: StreamPath[];
}

export interface LogQuery {
  lines: number;
  level?: Exclude<LogLevel, 'unknown'>;
  query?: string;
  since?: ISO8601String;
  source?: string;
}

export interface LogEntry {
  timestamp: ISO8601String;
  level: LogLevel;
  message: string;
  unit: string;
  source?: string;
  cursor?: string;
}

export interface LogsResponse {
  generatedAt: ISO8601String;
  source: DataSource;
  truncated: boolean;
  query: LogQuery;
  items: LogEntry[];
}

export interface ProtocolSummary {
  connections?: number;
  sessions?: number;
  muxers?: number;
  bytesReceived?: number;
  bytesSent?: number;
}

export interface MetricsSummary {
  generatedAt: ISO8601String;
  source: DataSource;
  available: boolean;
  totals: {
    paths?: number;
    bytesReceived?: number;
    bytesSent?: number;
  };
  protocols: Partial<Record<'rtsp' | 'rtmp' | 'hls' | 'webrtc' | 'srt', ProtocolSummary>>;
  warnings: string[];
}

export interface ConfigView {
  generatedAt: ISO8601String;
  source: DataSource;
  available: boolean;
  path?: string;
  redactedYaml: string;
  flags: {
    apiEnabled: boolean;
    metricsEnabled: boolean;
    pprofEnabled: boolean;
  };
  warnings: string[];
}

export interface DiagnosticCheck {
  id: string;
  label: string;
  status: 'ok' | 'warning' | 'error' | 'unknown';
  summary: string;
  details?: string;
}

export interface SafeDiagnosticsResponse {
  generatedAt: ISO8601String;
  source: DataSource;
  checks: DiagnosticCheck[];
  warnings: string[];
}
