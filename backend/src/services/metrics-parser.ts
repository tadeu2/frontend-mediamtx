import type { MetricsSummary } from '../../../shared/admin-api';

// ── Internal accumulator ────────────────────────────────────────────────

interface ProtocolAccum {
  connections: number;
  sessions: number;
  muxers: number;
  bytesReceived: number;
  bytesSent: number;
}

// ── Metric prefix map ──────────────────────────────────────────────────
//
// Each entry maps a Prometheus metric name prefix to either:
//   - a totals field (no protocol key → stored in totals.*)
//   - a protocol field (protocol key set → stored in protocols[protocol].*)
//
// RTSP+RTSPS and RTMP+RTMPS share the same protocol key, which achieves
// merge-by-summation with zero extra logic.
//
// Both `_inbound_bytes` / `_outbound_bytes` (spec terminology) and
// `_bytes_received` / `_bytes_sent` (MediaMTX Go terminology) are
// supported so the parser works against both naming conventions.

const METRIC_MAP: Record<string, { protocol?: string; field: string }> = {
  // ── Totals ──────────────────────────────────────────
  paths:                     { field: 'paths' },
  paths_inbound_bytes:       { field: 'bytesReceived' },
  paths_outbound_bytes:      { field: 'bytesSent' },
  paths_bytes_received:      { field: 'bytesReceived' },
  paths_bytes_sent:          { field: 'bytesSent' },

  // ── RTSP (RTSP + RTSPS merged) ──────────────────────
  rtsp_conns:                { protocol: 'rtsp', field: 'connections' },
  rtsps_conns:               { protocol: 'rtsp', field: 'connections' },
  rtsp_sessions:             { protocol: 'rtsp', field: 'sessions' },
  rtsps_sessions:            { protocol: 'rtsp', field: 'sessions' },
  rtsp_conns_inbound_bytes:  { protocol: 'rtsp', field: 'bytesReceived' },
  rtsp_conns_outbound_bytes: { protocol: 'rtsp', field: 'bytesSent' },
  rtsps_conns_inbound_bytes: { protocol: 'rtsp', field: 'bytesReceived' },
  rtsps_conns_outbound_bytes:{ protocol: 'rtsp', field: 'bytesSent' },
  rtsp_conns_bytes_received: { protocol: 'rtsp', field: 'bytesReceived' },
  rtsp_conns_bytes_sent:     { protocol: 'rtsp', field: 'bytesSent' },
  rtsps_conns_bytes_received:{ protocol: 'rtsp', field: 'bytesReceived' },
  rtsps_conns_bytes_sent:    { protocol: 'rtsp', field: 'bytesSent' },

  // ── RTMP (RTMP + RTMPS merged) ──────────────────────
  rtmp_conns:                { protocol: 'rtmp', field: 'connections' },
  rtmps_conns:               { protocol: 'rtmp', field: 'connections' },
  rtmp_conns_inbound_bytes:  { protocol: 'rtmp', field: 'bytesReceived' },
  rtmp_conns_outbound_bytes: { protocol: 'rtmp', field: 'bytesSent' },
  rtmps_conns_inbound_bytes: { protocol: 'rtmp', field: 'bytesReceived' },
  rtmps_conns_outbound_bytes:{ protocol: 'rtmp', field: 'bytesSent' },
  rtmp_conns_bytes_received: { protocol: 'rtmp', field: 'bytesReceived' },
  rtmp_conns_bytes_sent:     { protocol: 'rtmp', field: 'bytesSent' },
  rtmps_conns_bytes_received:{ protocol: 'rtmp', field: 'bytesReceived' },
  rtmps_conns_bytes_sent:    { protocol: 'rtmp', field: 'bytesSent' },

  // ── HLS ─────────────────────────────────────────────
  hls_muxers:                { protocol: 'hls', field: 'muxers' },
  hls_sessions:              { protocol: 'hls', field: 'sessions' },
  hls_connections:           { protocol: 'hls', field: 'connections' },
  hls_muxers_inbound_bytes:  { protocol: 'hls', field: 'bytesReceived' },
  hls_muxers_outbound_bytes: { protocol: 'hls', field: 'bytesSent' },
  hls_muxers_bytes_received: { protocol: 'hls', field: 'bytesReceived' },
  hls_muxers_bytes_sent:     { protocol: 'hls', field: 'bytesSent' },

  // ── WebRTC ──────────────────────────────────────────
  webrtc_sessions:                { protocol: 'webrtc', field: 'sessions' },
  webrtc_sessions_inbound_bytes:  { protocol: 'webrtc', field: 'bytesReceived' },
  webrtc_sessions_outbound_bytes: { protocol: 'webrtc', field: 'bytesSent' },
  webrtc_sessions_bytes_received: { protocol: 'webrtc', field: 'bytesReceived' },
  webrtc_sessions_bytes_sent:     { protocol: 'webrtc', field: 'bytesSent' },

  // ── SRT ─────────────────────────────────────────────
  srt_conns:                { protocol: 'srt', field: 'connections' },
  srt_sessions:             { protocol: 'srt', field: 'sessions' },
  srt_conns_inbound_bytes:  { protocol: 'srt', field: 'bytesReceived' },
  srt_conns_outbound_bytes: { protocol: 'srt', field: 'bytesSent' },
  srt_conns_bytes_received: { protocol: 'srt', field: 'bytesReceived' },
  srt_conns_bytes_sent:     { protocol: 'srt', field: 'bytesSent' },
};

// Regex matches: metric_name [{labels}] value [timestamp]
// group 1 = metric name, group 2 = label block (optional),
// group 3 = value string (may be NaN, Inf, scientific notation),
// group 4 = optional timestamp (ignored)
const METRIC_LINE_RE = /^(\w+)(?:\{([^}]*)\})?\s+(\S+)(?:\s+(\d+))?$/;

// ── Helpers ─────────────────────────────────────────────────────────────

function ensureProtocol(
  acc: Record<string, ProtocolAccum>,
  key: string,
): ProtocolAccum {
  if (!acc[key]) {
    acc[key] = { connections: 0, sessions: 0, muxers: 0, bytesReceived: 0, bytesSent: 0 };
  }
  return acc[key];
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Parse raw Prometheus exposition-format text from MediaMTX `/metrics`
 * into a structured {@link MetricsSummary} DTO.
 *
 * Never throws. Returns `available: false` with warnings on parse failure
 * or empty/unrecognizable input.
 */
export function parsePrometheusMetrics(rawText: string): MetricsSummary {
  const lines = rawText.split('\n');

  const totals = { paths: 0, bytesReceived: 0, bytesSent: 0 };
  const protocolAcc: Record<string, ProtocolAccum> = {};
  const warnings: string[] = [];
  const seenProtocols = new Set<string>();

  let recognizedCount = 0;
  let lineNum = 0;

  for (const rawLine of lines) {
    lineNum += 1;
    const line = rawLine.trim();

    // Skip empty lines and comments
    if (line === '' || line.startsWith('#')) {
      continue;
    }

    const match = line.match(METRIC_LINE_RE);
    if (!match) {
      warnings.push(`line ${lineNum}: could not parse metric line`);
      continue;
    }

    const [, metricName, , rawValue] = match;
    const mapping = METRIC_MAP[metricName];

    if (!mapping) {
      // Unrecognized metric — silently skip (per F1-R toleration requirement)
      continue;
    }

    const numVal = parseFloat(rawValue);
    if (!Number.isFinite(numVal)) {
      warnings.push(
        `line ${lineNum}: non-finite value "${rawValue}" for "${metricName}" (skipped)`,
      );
      continue;
    }

    recognizedCount += 1;

    if (mapping.protocol) {
      const accum = ensureProtocol(protocolAcc, mapping.protocol);
      accum[mapping.field as keyof ProtocolAccum] += numVal;
      seenProtocols.add(mapping.protocol);
    } else {
      // Totals field
      totals[mapping.field as keyof typeof totals] += numVal;
    }
  }

  // Build protocols output: only include protocols that appeared in the payload
  const protocols: MetricsSummary['protocols'] = {};
  for (const proto of seenProtocols) {
    protocols[proto as keyof MetricsSummary['protocols']] = {
      ...protocolAcc[proto],
    };
  }

  // Determine available flag
  const available = recognizedCount > 0;
  if (!available && warnings.length === 0 && rawText.trim() === '') {
    warnings.push('Metrics payload is empty.');
  }
  if (!available && warnings.length === 0) {
    warnings.push('No recognized metrics in payload.');
  }

  return {
    generatedAt: new Date().toISOString(),
    source: 'metrics',
    available,
    totals: {
      paths: totals.paths > 0 ? totals.paths : undefined,
      bytesReceived: totals.bytesReceived > 0 ? totals.bytesReceived : undefined,
      bytesSent: totals.bytesSent > 0 ? totals.bytesSent : undefined,
    },
    protocols,
    warnings,
  };
}
