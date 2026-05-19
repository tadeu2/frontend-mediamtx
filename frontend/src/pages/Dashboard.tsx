import { useEffect, useState } from 'react';
import { useApi } from '../api/ApiContext';
import type { HealthResponse, StreamsResponse } from '../../../shared/admin-api';

interface StatusData {
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
  badge: (active: boolean) => ({
    display: 'inline-block',
    padding: '0.15rem 0.55rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 600,
    background: active ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
    color: active ? 'var(--success)' : 'var(--error)',
  } as React.CSSProperties),
  loading: { color: 'var(--text-muted)', padding: '2rem 0', fontSize: '0.9rem' } as React.CSSProperties,
  error: { color: 'var(--error)', padding: '1rem 0', fontSize: '0.9rem' } as React.CSSProperties,
  unavailable: { color: 'var(--warning)', padding: '1rem 0', fontSize: '0.9rem' } as React.CSSProperties,
  warningList: { listStyle: 'none', padding: 0, margin: '0.5rem 0 0' } as React.CSSProperties,
  warningItem: { fontSize: '0.8rem', color: 'var(--warning)', padding: '0.15rem 0' } as React.CSSProperties,
  summaryValue: { fontSize: '2rem', fontWeight: 700, color: 'var(--accent)', lineHeight: 1 } as React.CSSProperties,
  summaryLabel: { fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' } as React.CSSProperties,
};

function formatUptime(seconds?: number): string {
  if (seconds == null) return '--';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function Dashboard() {
  const api = useApi();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [status, setStatus] = useState<StatusData | null>(null);
  const [streams, setStreams] = useState<StreamsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [h, s, str] = await Promise.all([
          api.getHealth(ac.signal),
          api.getStatus(ac.signal),
          api.getStreams(ac.signal),
        ]);
        if (!cancelled) {
          setHealth(h);
          setStatus(s as StatusData);
          setStreams(str);
        }
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
    return <div style={s.loading}>Loading dashboard data…</div>;
  }

  if (error) {
    return <div style={s.error}>Failed to load dashboard. {error}</div>;
  }

  return (
    <div style={s.page}>
      <h1 style={s.title}>Dashboard</h1>

      {/* Health + Status cards */}
      <div style={s.row}>
        <div style={{ ...s.card, flex: '1 1 280px' }}>
          <div style={s.sectionTitle}>Health</div>
          <div style={s.summaryValue}>{health?.ok ? 'OK' : '--'}</div>
          <div style={s.summaryLabel}>{health?.service ?? 'mediamtx-admin-ui'}</div>
        </div>

        <div style={{ ...s.card, flex: '1 1 280px' }}>
          <div style={s.sectionTitle}>Service Status</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={s.badge(status?.service.active ?? false)}>
              {status?.service.active ? 'ACTIVE' : 'INACTIVE'}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {status?.service.state ?? '--'}
            </span>
          </div>
          {status?.service.unit && (
            <div style={s.statLabel}>Unit: {status.service.unit}</div>
          )}
        </div>

        <div style={{ ...s.card, flex: '1 1 280px' }}>
          <div style={s.sectionTitle}>Overview</div>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <div>
              <div style={s.summaryValue}>{streams?.total ?? '--'}</div>
              <div style={s.summaryLabel}>Streams / Paths</div>
            </div>
            <div>
              <div style={s.summaryValue}>{status?.service.uptimeSeconds != null ? formatUptime(status.service.uptimeSeconds) : '--'}</div>
              <div style={s.summaryLabel}>Uptime</div>
            </div>
          </div>
        </div>
      </div>

      {/* Service details */}
      <div style={s.card}>
        <div style={s.sectionTitle}>Service Details</div>
        <div style={s.row}>
          <div style={s.stat}>
            <div style={s.statLabel}>Unit</div>
            <div style={s.statValue}>{status?.service.unit ?? '--'}</div>
          </div>
          <div style={s.stat}>
            <div style={s.statLabel}>State</div>
            <div style={s.statValue}>{status?.service.state ?? '--'}</div>
          </div>
          <div style={s.stat}>
            <div style={s.statLabel}>Substate</div>
            <div style={s.statValue}>{status?.service.substate ?? '--'}</div>
          </div>
          <div style={s.stat}>
            <div style={s.statLabel}>Version</div>
            <div style={s.statValue}>{status?.service.version ?? '--'}</div>
          </div>
          <div style={s.stat}>
            <div style={s.statLabel}>Since</div>
            <div style={s.statValue}>{status?.service.since ? new Date(status.service.since).toLocaleString() : '--'}</div>
          </div>
          <div style={s.stat}>
            <div style={s.statLabel}>Data Source</div>
            <div style={s.statValue}>{status?.source ?? '--'}</div>
          </div>
        </div>
      </div>

      {/* Streams summary */}
      <div style={s.card}>
        <div style={s.sectionTitle}>Stream / Path Summary</div>
        {streams && streams.total > 0 ? (
          <div style={s.row}>
            <div style={s.stat}>
              <div style={s.statLabel}>Total Paths</div>
              <div style={s.statValue}>{streams.total}</div>
            </div>
            <div style={s.stat}>
              <div style={s.statLabel}>Source</div>
              <div style={s.statValue}>{streams.source}</div>
            </div>
          </div>
        ) : (
          <div style={s.unavailable}>No active streams or paths.</div>
        )}
      </div>

      {/* Warnings */}
      {status?.warnings && status.warnings.length > 0 && (
        <div style={s.card}>
          <div style={s.sectionTitle}>Warnings</div>
          <ul style={s.warningList}>
            {status.warnings.map((w, i) => (
              <li key={i} style={s.warningItem}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
