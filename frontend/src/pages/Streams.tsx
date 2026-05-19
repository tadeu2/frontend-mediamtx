import { useEffect, useState } from 'react';
import { useApi } from '../api/ApiContext';
import type { StreamsResponse, StreamPath } from '../../../shared/admin-api';

/* ---- inline styles ---- */

const s = {
  page: { display: 'flex', flexDirection: 'column', gap: '1.5rem' } as React.CSSProperties,
  title: { fontSize: '1.35rem', fontWeight: 600, color: 'var(--text)' } as React.CSSProperties,
  controls: { display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' } as React.CSSProperties,
  input: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    color: 'var(--text)',
    padding: '0.4rem 0.75rem',
    fontSize: '0.85rem',
    minWidth: '240px',
    outline: 'none',
  } as React.CSSProperties,
  summary: { fontSize: '0.85rem', color: 'var(--text-muted)' } as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' } as React.CSSProperties,
  th: {
    textAlign: 'left',
    padding: '0.6rem 0.75rem',
    borderBottom: '1px solid var(--border)',
    color: 'var(--text-muted)',
    fontWeight: 600,
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  } as React.CSSProperties,
  td: {
    padding: '0.55rem 0.75rem',
    borderBottom: '1px solid var(--border)',
    color: 'var(--text)',
    whiteSpace: 'nowrap',
  } as React.CSSProperties,
  statusBadge: (status: string): React.CSSProperties => {
    const colors: Record<string, string> = {
      ready: 'var(--success)',
      idle: 'var(--warning)',
      unavailable: 'var(--error)',
      unknown: 'var(--text-muted)',
    };
    return {
      display: 'inline-block',
      padding: '0.1rem 0.5rem',
      borderRadius: '3px',
      fontSize: '0.7rem',
      fontWeight: 600,
      textTransform: 'uppercase',
      background: `${colors[status] ?? 'var(--text-muted)'}22`,
      color: colors[status] ?? 'var(--text-muted)',
    };
  },
  loading: { color: 'var(--text-muted)', padding: '2rem 0', fontSize: '0.9rem' } as React.CSSProperties,
  error: { color: 'var(--error)', padding: '1rem 0', fontSize: '0.9rem' } as React.CSSProperties,
  empty: { color: 'var(--text-muted)', padding: '2rem 0', fontSize: '0.9rem' } as React.CSSProperties,
  unavailable: { color: 'var(--warning)', padding: '1rem 0', fontSize: '0.9rem' } as React.CSSProperties,
};

function formatBytes(bytes?: number): string {
  if (bytes == null) return '--';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function Streams() {
  const api = useApi();
  const [data, setData] = useState<StreamsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const result = await api.getStreams(ac.signal);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <div style={s.loading}>Loading streams…</div>;
  }

  if (error) {
    return <div style={s.error}>Failed to load streams. {error}</div>;
  }

  if (!data || data.source === 'unavailable') {
    return (
      <div style={s.page}>
        <h1 style={s.title}>Streams</h1>
        <div style={s.unavailable}>Stream data is currently unavailable.</div>
      </div>
    );
  }

  const filtered: StreamPath[] = filter
    ? data.items.filter((item) => item.name.toLowerCase().includes(filter.toLowerCase()))
    : data.items;

  return (
    <div style={s.page}>
      <h1 style={s.title}>Streams</h1>

      <div style={s.controls}>
        <input
          style={s.input}
          type="text"
          placeholder="Filter by name…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <span style={s.summary}>
          {filtered.length} of {data.total} streams
        </span>
      </div>

      {filtered.length === 0 ? (
        <div style={s.empty}>
          {data.total === 0 ? 'No active streams or paths.' : 'No streams match the filter.'}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Name</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Protocol</th>
                <th style={s.th}>Readers</th>
                <th style={s.th}>Publishers</th>
                <th style={s.th}>Rx</th>
                <th style={s.th}>Tx</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.name}>
                  <td style={s.td}>{item.name}</td>
                  <td style={s.td}>
                    <span style={s.statusBadge(item.status)}>{item.status}</span>
                  </td>
                  <td style={s.td}>{item.protocol ?? '--'}</td>
                  <td style={s.td}>{item.readers ?? '--'}</td>
                  <td style={s.td}>{item.publishers ?? '--'}</td>
                  <td style={s.td}>{formatBytes(item.bytesReceived)}</td>
                  <td style={s.td}>{formatBytes(item.bytesSent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
