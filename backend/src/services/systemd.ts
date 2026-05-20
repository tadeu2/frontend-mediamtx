import type { SafeDiagnosticsResponse, ServiceStatus } from '../../../shared/admin-api';

import { runSafeCommand } from './command';

const ALLOWED_UNIT = 'mediamtx.service';

function now() {
  return new Date().toISOString();
}

function parseShowOutput(output: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const line of output.split(/\r?\n/)) {
    if (!line.includes('=')) continue;
    const idx = line.indexOf('=');
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key) map[key] = value;
  }
  return map;
}

export async function readSystemdStatus(): Promise<ServiceStatus> {
  const args = [
    'show',
    ALLOWED_UNIT,
    '--no-pager',
    '--property',
    'Id,ActiveState,SubState,ActiveEnterTimestamp'
  ];
  const result = await runSafeCommand('sudo', ['-n', '/usr/bin/systemctl', ...args]);

  if (!result.ok) {
    return {
      unit: ALLOWED_UNIT,
      active: false,
      state: 'unknown'
    };
  }

  const values = parseShowOutput(result.stdout);
  const state = values.ActiveState || 'unknown';
  const sinceTs = Date.parse(values.ActiveEnterTimestamp || '');

  return {
    unit: values.Id || ALLOWED_UNIT,
    active: state === 'active',
    state,
    substate: values.SubState || undefined,
    since: Number.isNaN(sinceTs) ? undefined : new Date(sinceTs).toISOString()
  };
}

export async function readSafeDiagnostics(): Promise<SafeDiagnosticsResponse> {
  const status = await readSystemdStatus();

  return {
    generatedAt: now(),
    source: status.state === 'unknown' ? 'unavailable' : 'systemd',
    checks: [
      {
        id: 'read-only-boundary',
        label: 'Read-only boundary',
        status: 'ok',
        summary: 'No restart/reload actions are exposed by diagnostics.'
      },
      {
        id: 'systemd-status',
        label: 'Systemd unit status',
        status: status.state === 'unknown' ? 'warning' : 'ok',
        summary:
          status.state === 'unknown'
            ? 'systemctl unavailable or inaccessible; returning bounded fallback.'
            : `${status.unit} is ${status.state}${status.substate ? ` (${status.substate})` : ''}.`
      }
    ],
    warnings: status.state === 'unknown' ? ['systemctl unavailable; diagnostics are partial.'] : []
  };
}
