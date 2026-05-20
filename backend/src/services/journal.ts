import type { LogEntry, LogsResponse } from '../../../shared/admin-api';

import { runSafeCommand } from './command';

const ALLOWED_UNIT = 'mediamtx.service';
const DEFAULT_LINES = 100;
const MAX_LINES = 300;

function now() {
  return new Date().toISOString();
}

function normalizeLines(lines: number | undefined): number {
  if (!lines || Number.isNaN(lines)) return DEFAULT_LINES;
  return Math.min(Math.max(Math.trunc(lines), 1), MAX_LINES);
}

function mapLevel(level?: 'debug' | 'info' | 'warning' | 'error') {
  if (!level) return undefined;
  if (level === 'debug') return '7';
  if (level === 'info') return '6';
  if (level === 'warning') return '4';
  if (level === 'error') return '3';
  return undefined;
}

function parseLogLine(line: string): LogEntry {
  const trimmed = line.trim();
  const firstSpace = trimmed.indexOf(' ');
  const candidateTs = firstSpace > 0 ? trimmed.slice(0, firstSpace) : '';
  const parsedTs = Date.parse(candidateTs);

  return {
    timestamp: Number.isNaN(parsedTs) ? now() : new Date(parsedTs).toISOString(),
    level: 'unknown',
    message: firstSpace > 0 ? trimmed.slice(firstSpace + 1).trim() : trimmed,
    unit: ALLOWED_UNIT,
    source: 'journalctl'
  };
}

export async function readJournalLogs(params: {
  lines?: number;
  level?: 'debug' | 'info' | 'warning' | 'error';
  query?: string;
}): Promise<LogsResponse> {
  const lines = normalizeLines(params.lines);
  const priority = mapLevel(params.level);
  const args = ['-u', ALLOWED_UNIT, '--no-pager', '-n', String(lines), '-o', 'short-iso'];

  if (priority) {
    args.push('--priority', priority);
  }

  const result = await runSafeCommand('journalctl', args);
  if (!result.ok) {
    return {
      generatedAt: now(),
      source: 'unavailable',
      truncated: false,
      query: { lines, level: params.level, query: params.query },
      items: []
    };
  }

  const filter = params.query?.trim().toLowerCase();
  const allItems = result.stdout
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map(parseLogLine);

  const filteredItems =
    filter && filter.length > 0
      ? allItems.filter((entry) => entry.message.toLowerCase().includes(filter))
      : allItems;

  return {
    generatedAt: now(),
    source: 'journalctl',
    truncated: allItems.length >= lines,
    query: { lines, level: params.level, query: params.query, source: ALLOWED_UNIT },
    items: filteredItems
  };
}
