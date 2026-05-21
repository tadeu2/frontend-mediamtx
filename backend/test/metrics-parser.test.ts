import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for parsePrometheusMetrics — the Prometheus exposition-format
 * parser that powers the /api/metrics endpoint.
 *
 * Covers:
 *   - Happy path with all totals + 5 protocols
 *   - RTSP+RTSPS and RTMP+RTMPS merge-by-summation
 *   - Empty / whitespace-only input
 *   - Malformed lines (NaN, Inf, missing value)
 *   - Partial protocol set
 *   - Comment and blank line tolerance
 *   - Scientific notation
 *   - Unrecognized metric names
 */

import { parsePrometheusMetrics } from '../src/services/metrics-parser';

// ── Fixtures ─────────────────────────────────────────────────────────────

/**
 * Realistic full MediaMTX metrics payload covering all totals and five
 * protocol families: RTSP+RTSPS, RTMP+RTMPS, HLS, WebRTC, SRT.
 */
function fullFixture(): string {
  return [
    '# HELP paths Number of paths.',
    '# TYPE paths gauge',
    'paths{name="all"} 3',
    '# HELP paths_bytes_received Total bytes received.',
    '# TYPE paths_bytes_received gauge',
    'paths_bytes_received{name="all"} 150000000',
    '# HELP paths_bytes_sent Total bytes sent.',
    '# TYPE paths_bytes_sent gauge',
    'paths_bytes_sent{name="all"} 20000000',
    '',
    '# RTSP',
    'rtsp_conns{name="all"} 2',
    'rtsps_conns{name="all"} 1',
    'rtsp_sessions{name="all"} 5',
    'rtsps_sessions{name="all"} 3',
    'rtsp_conns_bytes_received{name="all"} 1000000',
    'rtsps_conns_bytes_received{name="all"} 500000',
    'rtsp_conns_bytes_sent{name="all"} 300000',
    'rtsps_conns_bytes_sent{name="all"} 200000',
    '',
    '# RTMP',
    'rtmp_conns{name="all"} 1',
    'rtmps_conns{name="all"} 0',
    'rtmp_conns_bytes_received{name="all"} 400000',
    'rtmps_conns_bytes_received{name="all"} 0',
    'rtmp_conns_bytes_sent{name="all"} 100000',
    'rtmps_conns_bytes_sent{name="all"} 0',
    '',
    '# HLS',
    'hls_muxers{name="all"} 2',
    'hls_sessions{name="all"} 4',
    'hls_muxers_bytes_received{name="all"} 5000000',
    'hls_muxers_bytes_sent{name="all"} 2000000',
    '',
    '# WebRTC',
    'webrtc_sessions{name="all"} 6',
    'webrtc_sessions_bytes_received{name="all"} 750000',
    'webrtc_sessions_bytes_sent{name="all"} 1200000',
    '',
    '# SRT',
    'srt_conns{name="all"} 3',
    'srt_sessions{name="all"} 3',
    'srt_conns_bytes_received{name="all"} 900000',
    'srt_conns_bytes_sent{name="all"} 450000',
  ].join('\n');
}

// ── Happy Path ───────────────────────────────────────────────────────────

describe('parsePrometheusMetrics — happy path', { concurrency: 1 }, () => {
  it('F1-R01–R05: parses full payload into complete MetricsSummary', () => {
    const result = parsePrometheusMetrics(fullFixture());

    assert.equal(result.available, true);
    assert.equal(result.source, 'metrics');
    assert.ok(typeof result.generatedAt === 'string');

    // Totals (F1-R02, R03, R04)
    assert.equal(result.totals.paths, 3);
    assert.equal(result.totals.bytesReceived, 150000000);
    assert.equal(result.totals.bytesSent, 20000000);

    // All five protocols present (F1-R05)
    assert.ok(result.protocols.rtsp, 'rtsp should be present');
    assert.ok(result.protocols.rtmp, 'rtmp should be present');
    assert.ok(result.protocols.hls, 'hls should be present');
    assert.ok(result.protocols.webrtc, 'webrtc should be present');
    assert.ok(result.protocols.srt, 'srt should be present');

    // No warnings for clean payload
    assert.equal(result.warnings.length, 0);
  });
});

// ── Merged Protocols ─────────────────────────────────────────────────────

describe('parsePrometheusMetrics — merged protocols', { concurrency: 1 }, () => {
  it('F1-R06: RTSP+RTSPS connections are summed', () => {
    const fixture = [
      'rtsp_conns{name="all"} 2',
      'rtsps_conns{name="all"} 1',
    ].join('\n');

    const result = parsePrometheusMetrics(fixture);
    assert.equal(result.protocols.rtsp!.connections, 3);
  });

  it('F1-R06: RTSP+RTSPS sessions are summed', () => {
    const fixture = [
      'rtsp_sessions{name="all"} 5',
      'rtsps_sessions{name="all"} 3',
    ].join('\n');

    const result = parsePrometheusMetrics(fixture);
    assert.equal(result.protocols.rtsp!.sessions, 8);
  });

  it('F1-R06: RTMP+RTMPS connections are summed', () => {
    const fixture = [
      'rtmp_conns{name="all"} 1',
      'rtmps_conns{name="all"} 1',
    ].join('\n');

    const result = parsePrometheusMetrics(fixture);
    assert.equal(result.protocols.rtmp!.connections, 2);
  });

  it('F1-R07: RTSP bytes are summed across merged protocols', () => {
    const fixture = [
      'rtsp_conns_bytes_received{name="all"} 1000',
      'rtsps_conns_bytes_received{name="all"} 500',
      'rtsp_conns_bytes_sent{name="all"} 300',
      'rtsps_conns_bytes_sent{name="all"} 200',
    ].join('\n');

    const result = parsePrometheusMetrics(fixture);
    assert.equal(result.protocols.rtsp!.bytesReceived, 1500);
    assert.equal(result.protocols.rtsp!.bytesSent, 500);
  });
});

// ── Edge Cases ───────────────────────────────────────────────────────────

describe('parsePrometheusMetrics — edge cases', { concurrency: 1 }, () => {
  it('F1-R08: empty string returns available=false with warning', () => {
    const result = parsePrometheusMetrics('');
    assert.equal(result.available, false);
    assert.equal(result.warnings.length, 1);
    assert.ok(result.warnings[0].includes('empty'));
  });

  it('F1-R08: whitespace-only returns available=false with warning', () => {
    const result = parsePrometheusMetrics('   \n  \n  ');
    assert.equal(result.available, false);
    assert.ok(result.warnings.length > 0);
  });

  it('F1-R08: no recognized metrics returns available=false', () => {
    const result = parsePrometheusMetrics('# Just a comment\n# another comment');
    assert.equal(result.available, false);
    assert.ok(result.warnings.length > 0);
  });

  it('F1-R10: malformed line with NaN value is skipped, valid lines survive', () => {
    const fixture = [
      'paths{name="all"} 3',
      'rtsp_conns{name="all"} NaN',
      'rtmp_conns{name="all"} 1',
    ].join('\n');

    const result = parsePrometheusMetrics(fixture);
    assert.equal(result.available, true);
    assert.equal(result.totals.paths, 3);
    assert.equal(result.protocols.rtmp!.connections, 1);
    // rtsp_conns was NaN → not accumulated
    assert.equal(result.protocols.rtsp, undefined);
    // Warning for the NaN line
    assert.ok(result.warnings.some(w => w.includes('NaN')));
  });

  it('F1-R10: malformed line with Inf is skipped, warns', () => {
    const fixture = 'rtsp_conns{name="all"} Inf';
    const result = parsePrometheusMetrics(fixture);
    assert.equal(result.available, false);
    assert.ok(result.warnings.some(w => w.includes('non-finite')));
  });

  it('F1-R10: corrupt line (no value) is skipped, valid metrics survive', () => {
    const fixture = [
      'paths{name="all"} 5',
      'rtsp_conns',                    // missing value
      'hls_muxers{name="all"} 2',
    ].join('\n');

    const result = parsePrometheusMetrics(fixture);
    assert.equal(result.available, true);
    assert.equal(result.totals.paths, 5);
    assert.equal(result.protocols.hls!.muxers, 2);
    assert.ok(result.warnings.some(w => w.includes('could not parse')));
  });

  it('F1-R13: absent protocols are omitted (undefined), not zero-filled', () => {
    const fixture = [
      'paths{name="all"} 1',
      'rtsp_conns{name="all"} 1',
    ].join('\n');

    const result = parsePrometheusMetrics(fixture);
    assert.equal(result.protocols.rtsp!.connections, 1);
    assert.equal(result.protocols.rtmp, undefined);
    assert.equal(result.protocols.hls, undefined);
    assert.equal(result.protocols.webrtc, undefined);
    assert.equal(result.protocols.srt, undefined);
  });

  it('F1-R11: comment lines (#) are silently ignored', () => {
    const fixture = [
      '# HELP paths Number of paths.',
      '# TYPE paths gauge',
      'paths{name="all"} 7',
    ].join('\n');

    const result = parsePrometheusMetrics(fixture);
    assert.equal(result.available, true);
    assert.equal(result.totals.paths, 7);
    assert.equal(result.warnings.length, 0);
  });

  it('F1-R11: blank lines between metrics are silently ignored', () => {
    const fixture = [
      '',
      'paths{name="all"} 1',
      '',
      'rtsp_conns{name="all"} 1',
      '',
    ].join('\n');

    const result = parsePrometheusMetrics(fixture);
    assert.equal(result.available, true);
    assert.equal(result.totals.paths, 1);
    assert.equal(result.protocols.rtsp!.connections, 1);
    assert.equal(result.warnings.length, 0);
  });

  it('F1-R12: scientific notation is correctly parsed', () => {
    const fixture = 'paths_bytes_received{name="all"} 1.5e+08';
    const result = parsePrometheusMetrics(fixture);
    assert.equal(result.totals.bytesReceived, 150000000);
  });

  it('F1-R12: scientific notation with negative exponent', () => {
    const fixture = 'paths_bytes_sent{name="all"} 1.23e-02';
    const result = parsePrometheusMetrics(fixture);
    assert.equal(result.totals.bytesSent, 0.0123);
  });

  it('F1-R12: large scientific notation 1.5e+06', () => {
    const fixture = 'paths_bytes_received{name="all"} 1.5e+06';
    const result = parsePrometheusMetrics(fixture);
    assert.equal(result.totals.bytesReceived, 1500000);
  });

  it('unrecognized metric names are silently skipped', () => {
    const fixture = [
      'paths{name="all"} 2',
      'custom_unknown_metric{name="all"} 42',
      'another_random_gauge 99',
    ].join('\n');

    const result = parsePrometheusMetrics(fixture);
    assert.equal(result.available, true);
    assert.equal(result.totals.paths, 2);
    // No warnings for unrecognized metrics (silently tolerated)
    assert.equal(result.warnings.length, 0);
  });

  // ── Totals edge case: zero value → undefined in output ──────────
  it('zero totals are preserved as undefined in output', () => {
    const result = parsePrometheusMetrics('paths{name="all"} 0');
    // paths was recognized (recognizedCount > 0) so available=true,
    // but zero maps to undefined per the clean-output convention.
    assert.equal(result.available, true);
    assert.equal(result.totals.paths, undefined);
    assert.equal(result.totals.bytesReceived, undefined);
    assert.equal(result.totals.bytesSent, undefined);
  });
});

// ── Both Naming Conventions ──────────────────────────────────────────────

describe('parsePrometheusMetrics — dual naming conventions', { concurrency: 1 }, () => {
  it('supports _bytes_received / _bytes_sent (MediaMTX Go convention)', () => {
    const fixture = [
      'paths_bytes_received{name="all"} 500',
      'paths_bytes_sent{name="all"} 200',
      'rtsp_conns_bytes_received{name="all"} 100',
      'rtsp_conns_bytes_sent{name="all"} 50',
    ].join('\n');

    const result = parsePrometheusMetrics(fixture);
    assert.equal(result.totals.bytesReceived, 500);
    assert.equal(result.totals.bytesSent, 200);
    assert.equal(result.protocols.rtsp!.bytesReceived, 100);
    assert.equal(result.protocols.rtsp!.bytesSent, 50);
  });

  it('supports _inbound_bytes / _outbound_bytes (spec naming)', () => {
    const fixture = [
      'paths_inbound_bytes{name="all"} 300',
      'paths_outbound_bytes{name="all"} 150',
      'rtsp_conns_inbound_bytes{name="all"} 80',
      'rtsp_conns_outbound_bytes{name="all"} 40',
    ].join('\n');

    const result = parsePrometheusMetrics(fixture);
    assert.equal(result.totals.bytesReceived, 300);
    assert.equal(result.totals.bytesSent, 150);
    assert.equal(result.protocols.rtsp!.bytesReceived, 80);
    assert.equal(result.protocols.rtsp!.bytesSent, 40);
  });

  it('sums across both naming conventions when both present', () => {
    const fixture = [
      'paths_inbound_bytes{name="all"} 100',
      'paths_bytes_received{name="all"} 200',
    ].join('\n');

    const result = parsePrometheusMetrics(fixture);
    assert.equal(result.totals.bytesReceived, 300);
  });
});
