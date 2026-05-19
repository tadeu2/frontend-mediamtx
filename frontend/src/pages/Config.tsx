import { useEffect, useState } from 'react';
import { useApi } from '../api/ApiContext';
import type { ConfigView } from '../../../shared/admin-api';

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
  flagBadge: (enabled: boolean): React.CSSProperties => ({
    display: 'inline-block',
    padding: '0.15rem 0.55rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 600,
    background: enabled ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
    color: enabled ? 'var(--success)' : 'var(--error)',
  }),
  yamlBlock: {
    background: '#0d1117',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    padding: '1rem 1.25rem',
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    fontSize: '0.8rem',
    lineHeight: 1.6,
    color: 'var(--text)',
    overflowX: 'auto',
    whiteSpace: 'pre',
    maxHeight: '70vh',
    overflowY: 'auto',
  } as React.CSSProperties,
  loading: { color: 'var(--text-muted)', padding: '2rem 0', fontSize: '0.9rem' } as React.CSSProperties,
  error: { color: 'var(--error)', padding: '1rem 0', fontSize: '0.9rem' } as React.CSSProperties,
  unavailable: { color: 'var(--warning)', padding: '1rem 0', fontSize: '0.9rem' } as React.CSSProperties,
  empty: { color: 'var(--text-muted)', padding: '2rem 0', fontSize: '0.9rem' } as React.CSSProperties,
  warningList: { listStyle: 'none', padding: 0, margin: '0.5rem 0 0' } as React.CSSProperties,
  warningItem: { fontSize: '0.8rem', color: 'var(--warning)', padding: '0.15rem 0' } as React.CSSProperties,
  readOnlyBanner: {
    background: 'rgba(79,140,255,0.08)',
    border: '1px solid rgba(79,140,255,0.2)',
    borderRadius: '4px',
    padding: '0.5rem 0.75rem',
    color: 'var(--accent)',
    fontSize: '0.8rem',
    fontWeight: 500,
  } as React.CSSProperties,
};

export function Config() {
  const api = useApi();
  const [data, setData] = useState<ConfigView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const result = await api.getConfig(ac.signal);
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
    return <div style={s.loading}>Loading configuration…</div>;
  }

  if (error) {
    return <div style={s.error}>Failed to load configuration. {error}</div>;
  }

  if (!data || !data.available) {
    return (
      <div style={s.page}>
        <h1 style={s.title}>Configuration</h1>
        <div style={s.unavailable}>Configuration is currently unavailable.</div>
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

  return (
    <div style={s.page}>
      <h1 style={s.title}>Configuration</h1>

      <div style={s.readOnlyBanner}>
        This view is read-only. Configuration cannot be edited from this interface.
      </div>

      {/* Flags */}
      <div style={s.card}>
        <div style={s.sectionTitle}>Feature Flags</div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <span style={s.flagBadge(data.flags.apiEnabled)}>
              {data.flags.apiEnabled ? 'API ENABLED' : 'API DISABLED'}
            </span>
          </div>
          <div>
            <span style={s.flagBadge(data.flags.metricsEnabled)}>
              {data.flags.metricsEnabled ? 'METRICS ENABLED' : 'METRICS DISABLED'}
            </span>
          </div>
          <div>
            <span style={s.flagBadge(data.flags.pprofEnabled)}>
              {data.flags.pprofEnabled ? 'PPROF ENABLED' : 'PPROF DISABLED'}
            </span>
          </div>
        </div>
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
            <div style={s.statLabel}>Path</div>
            <div style={s.statValue}>{data.path ?? '--'}</div>
          </div>
          <div style={s.stat}>
            <div style={s.statLabel}>Generated At</div>
            <div style={s.statValue}>{new Date(data.generatedAt).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* YAML content */}
      <div style={s.card}>
        <div style={s.sectionTitle}>Configuration (redacted)</div>
        {data.redactedYaml ? (
          <pre style={s.yamlBlock}>{data.redactedYaml}</pre>
        ) : (
          <div style={s.empty}>No configuration content available.</div>
        )}
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
