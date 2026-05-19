import { useEffect, useState } from 'react';
import { useApi } from '../api/ApiContext';
import type { LogsResponse, LogEntry, LogLevel } from '../../../shared/admin-api';

/* ---- inline styles ---- */

const s = {
  page: { display: 'flex', flexDirection: 'column', gap: '1.5rem' } as React.CSSProperties,
  title: { fontSize: '1.35rem', fontWeight: 600, color: 'var(--text)' } as React.CSSProperties,
  controls: { display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' } as React.CSSProperties,
  select: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    color: 'var(--text)',
    padding: '0.4rem 0.5rem',
    fontSize: '0.85rem',
    outline: 'none',
    cursor: 'pointer',
  } as React.CSSProperties,
  input: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    color: 'var(--text)',
    padding: '0.4rem 0.75rem',
    fontSize: '0.85rem',
    minWidth: '160px',
    outline: 'none',
  } as React.CSSProperties,
  summary: { fontSize: '0.8rem', color: 'var(--text-muted)' } as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' } as React.CSSProperties,
  th: {
    textAlign: 'left',
    padding: '0.55rem 0.75rem',
    borderBottom: '1px solid var(--border)',
    color: 'var(--text-muted)',
    fontWeight: 600,
    fontSize: '0.7rem',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  } as React.CSSProperties,
  td: {
    padding: '0.45rem 0.75rem',
    borderBottom: '1px solid var(--border)',
    color: 'var(--text)',
    verticalAlign: 'top',
  } as React.CSSProperties,
  tdTime: {
    padding: '0.45rem 0.75rem',
    borderBottom: '1px solid var(--border)',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
    fontSize: '0.78rem',
    verticalAlign: 'top',
  } as React.CSSProperties,
  tdMsg: {
    padding: '0.45rem 0.75rem',
    borderBottom: '1px solid var(--border)',
    color: 'var(--text)',
    wordBreak: 'break-all',
    maxWidth: '480px',
    verticalAlign: 'top',
  } as React.CSSProperties,
  levelBadge: (level: LogLevel): React.CSSProperties => {
    const colors: Record<LogLevel, string> = {
      debug: 'var(--text-muted)',
      info: 'var(--accent)',
      warning: 'var(--warning)',
      error: 'var(--error)',
      unknown: 'var(--text-muted)',
    };
    return {
      display: 'inline-block',
      padding: '0.1rem 0.45rem',
      borderRadius: '3px',
      fontSize: '0.65rem',
      fontWeight: 600,
      textTransform: 'uppercase',
      background: `${colors[level] ?? 'var(--text-muted)'}22`,
      color: colors[level] ?? 'var(--text-muted)',
    };
  },
  loading: { color: 'var(--text-muted)', padding: '2rem 0', fontSize: '0.9rem' } as React.CSSProperties,
  error: { color: 'var(--error)', padding: '1rem 0', fontSize: '0.9rem' } as React.CSSProperties,
  empty: { color: 'var(--text-muted)', padding: '2rem 0', fontSize: '0.9rem' } as React.CSSProperties,
  unavailable: { color: 'var(--warning)', padding: '1rem 0', fontSize: '0.9rem' } as React.CSSProperties,
  truncated: {
    background: 'rgba(251,191,36,0.08)',
    border: '1px solid rgba(251,191,36,0.2)',
    borderRadius: '4px',
    padding: '0.5rem 0.75rem',
    color: 'var(--warning)',
    fontSize: '0.8rem',
  } as React.CSSProperties,
};

export function Logs() {
  const api = useApi();
  const [data, setData] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState(100);
  const [level, setLevel] = useState<string>('');

  function fetchLogs() {
    const ac = new AbortController();
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const params: { lines?: number; level?: string } = { lines };
        if (level) (params as Record<string, string>).level = level;
        const result = await api.getLogs(params, ac.signal);
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled && !ac.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }

  useEffect(() => {
    const cleanup = fetchLogs();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, level]);

  if (loading) {
    return <div style={s.loading}>Loading logs…</div>;
  }

  if (error) {
    return <div style={s.error}>Failed to load logs. {error}</div>;
  }

  if (!data || data.source === 'unavailable') {
    return (
      <div style={s.page}>
        <h1 style={s.title}>Logs</h1>
        <div style={s.unavailable}>Log data is currently unavailable.</div>
      </div>
    );
  }

  const entries: LogEntry[] = data.items;

  return (
    <div style={s.page}>
      <h1 style={s.title}>Logs</h1>

      <div style={s.controls}>
        <select
          style={s.select}
          value={String(lines)}
          onChange={(e) => setLines(Number(e.target.value))}
        >
          <option value="25">25 lines</option>
          <option value="50">50 lines</option>
          <option value="100">100 lines</option>
          <option value="250">250 lines</option>
        </select>

        <select
          style={s.select}
          value={level}
          onChange={(e) => setLevel(e.target.value)}
        >
          <option value="">All levels</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
          <option value="debug">Debug</option>
        </select>

        <span style={s.summary}>
          {entries.length} entries • Source: {data.source}
          {data.truncated && ' • (truncated)'}
        </span>
      </div>

      {data.truncated && (
        <div style={s.truncated}>
          Log output was truncated. Use filters to narrow results or reduce line count.
        </div>
      )}

      {entries.length === 0 ? (
        <div style={s.empty}>No log entries found for the selected range.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Timestamp</th>
                <th style={s.th}>Level</th>
                <th style={s.th}>Unit</th>
                <th style={s.th}>Message</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => (
                <tr key={entry.cursor ?? idx}>
                  <td style={s.tdTime}>
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td style={s.td}>
                    <span style={s.levelBadge(entry.level)}>{entry.level}</span>
                  </td>
                  <td style={s.td}>{entry.unit}</td>
                  <td style={s.tdMsg}>{entry.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
