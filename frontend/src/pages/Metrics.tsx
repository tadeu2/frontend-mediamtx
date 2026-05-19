import { useEffect, useState } from 'react';
import { useApi } from '../api/ApiContext';
import type { MetricsSummary } from '../../../shared/admin-api';

/* ---- inline styles ---- */

const s = {
  page: { display: 'flex', flexDirection: 'column', gap: '1.5rem' } as React.CSSProperties,
  title: { fontSize: '1.35rem', fontWeight: 600, color: 'var(--text)' } as React.CSSProperties,
  sectionTitle: { fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem' } as React.CSSProperties,
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '1.25rem' } as React.CSSProperties,
  row: { display: 'flex', gap: '1.5rem', flexWrap: 'wrap' } as React.CSSProperties,
  stat: { flex: '1 1 180px', minWidth: 0 } as React.CSSProperties,
  statLabel: { fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' } as React.CSSProperties,
  statValue: { fontSize: '1.1rem', fontWeight: 500, color: 'var(--text)' } as React.CSSProperties,
  bigValue: { fontSize: '2rem', fontWeight: 700, color: 'var(--accent)', lineHeight: 1 } as React.CSSProperties,
  loading: { color: 'var(--text-muted)', padding: '2rem 0', fontSize: '0.9rem' } as React.CSSProperties,
  error: { color: 'var(--error)', padding: '1rem 0', fontSize: '0.9rem' } as React.CSSProperties,
  empty: { color: 'var(--text-muted)', padding: '2rem 0', fontSize: '0.9rem' } as React.CSSProperties,
  unavailable: { color: 'var(--warning)', padding: '1rem 0', fontSize: '0.9rem' } as React.CSSProperties,
  warningList: { listStyle: 'none', padding: 0, margin: '0.5rem 0 0' } as React.CSSProperties,
  warningItem: { fontSize: '0.8rem', color: 'var(--warning)', padding: '0.15rem 0' } as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' } as React.CSSProperties,
  th: {
    textAlign: 'left',
    padding: '0.5rem 0.75rem',
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
  } as React.CSSProperties,
};

function formatBytes(bytes?: number): string {
  if (bytes == null) return '--';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

const PROTOCOL_LABELS: Record<string, string> = {
  rtsp: 'RTSP',
  rtmp: 'RTMP',
  hls: 'HLS',
  webrtc: 'WebRTC',
  srt: 'SRT',
};

export function Metrics() {
  const api = useApi();
  const [data, setData] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const result = await api.getMetrics(ac.signal);
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
    return <div style={s.loading}>Loading metrics…</div>;
  }

  if (error) {
    return <div style={s.error}>Failed to load metrics. {error}</div>;
  }

  if (!data || !data.available) {
    return (
      <div style={s.page}>
        <h1 style={s.title}>Metrics</h1>
        <div style={s.unavailable}>Metrics data is currently unavailable.</div>
        {data?.warnings && data.warnings.length > 0 && (
          <ul style={s.warningList}>
            {data.warnings.map((w, i) => (
              <li key={i} style={s.warningItem}>{w}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const protocols = Object.entries(data.protocols ?? {});

  return (
    <div style={s.page}>
      <h1 style={s.title}>Metrics</h1>

      {/* Totals */}
      <div style={s.card}>
        <div style={s.sectionTitle}>Totals</div>
        <div style={s.row}>
          <div style={s.stat}>
            <div style={s.statLabel}>Paths</div>
            <div style={s.bigValue}>{data.totals.paths ?? '--'}</div>
          </div>
          <div style={s.stat}>
            <div style={s.statLabel}>Bytes Received</div>
            <div style={s.bigValue}>{data.totals.bytesReceived != null ? formatBytes(data.totals.bytesReceived) : '--'}</div>
          </div>
          <div style={s.stat}>
            <div style={s.statLabel}>Bytes Sent</div>
            <div style={s.bigValue}>{data.totals.bytesSent != null ? formatBytes(data.totals.bytesSent) : '--'}</div>
          </div>
        </div>
      </div>

      {/* Protocol breakdown */}
      <div style={s.card}>
        <div style={s.sectionTitle}>Protocol Breakdown</div>
        {protocols.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Protocol</th>
                  <th style={s.th}>Connections</th>
                  <th style={s.th}>Sessions</th>
                  <th style={s.th}>Muxers</th>
                  <th style={s.th}>Rx</th>
                  <th style={s.th}>Tx</th>
                </tr>
              </thead>
              <tbody>
                {protocols.map(([key, val]) => (
                  <tr key={key}>
                    <td style={s.td}>{PROTOCOL_LABELS[key] ?? key}</td>
                    <td style={s.td}>{val.connections ?? '--'}</td>
                    <td style={s.td}>{val.sessions ?? '--'}</td>
                    <td style={s.td}>{val.muxers ?? '--'}</td>
                    <td style={s.td}>{val.bytesReceived != null ? formatBytes(val.bytesReceived) : '--'}</td>
                    <td style={s.td}>{val.bytesSent != null ? formatBytes(val.bytesSent) : '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={s.empty}>No protocol metrics available.</div>
        )}
      </div>

      {/* Meta */}
      <div style={s.card}>
        <div style={s.sectionTitle}>Source Info</div>
        <div style={s.row}>
          <div style={s.stat}>
            <div style={s.statLabel}>Source</div>
            <div style={s.statValue}>{data.source}</div>
          </div>
          <div style={s.stat}>
            <div style={s.statLabel}>Generated At</div>
            <div style={s.statValue}>{new Date(data.generatedAt).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {data.warnings.length > 0 && (
        <div style={s.card}>
          <div style={s.sectionTitle}>Warnings</div>
          <ul style={s.warningList}>
            {data.warnings.map((w, i) => (
              <li key={i} style={s.warningItem}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
