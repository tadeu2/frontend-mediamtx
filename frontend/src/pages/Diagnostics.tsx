import { useEffect, useState } from 'react';
import { useApi } from '../api/ApiContext';
import type { SafeDiagnosticsResponse, DiagnosticCheck } from '../../../shared/admin-api';

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
  checkList: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' } as React.CSSProperties,
  checkItem: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '1rem 1.25rem',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
  } as React.CSSProperties,
  checkIcon: (status: string): React.CSSProperties => {
    const colors: Record<string, string> = {
      ok: 'var(--success)',
      warning: 'var(--warning)',
      error: 'var(--error)',
      unknown: 'var(--text-muted)',
    };
    const icons: Record<string, string> = {
      ok: '\u2713',
      warning: '!',
      error: '\u2717',
      unknown: '?',
    };
    return {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '28px',
      height: '28px',
      borderRadius: '50%',
      background: `${colors[status] ?? 'var(--text-muted)'}22`,
      color: colors[status] ?? 'var(--text-muted)',
      fontWeight: 700,
      fontSize: '0.85rem',
      flexShrink: 0,
    };
  },
  checkBody: { flex: 1, minWidth: 0 } as React.CSSProperties,
  checkLabel: { fontSize: '0.9rem', fontWeight: 500, color: 'var(--text)' } as React.CSSProperties,
  checkSummary: { fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' } as React.CSSProperties,
  checkDetails: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    marginTop: '0.4rem',
    padding: '0.5rem 0.75rem',
    background: '#0d1117',
    borderRadius: '4px',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  } as React.CSSProperties,
  loading: { color: 'var(--text-muted)', padding: '2rem 0', fontSize: '0.9rem' } as React.CSSProperties,
  error: { color: 'var(--error)', padding: '1rem 0', fontSize: '0.9rem' } as React.CSSProperties,
  empty: { color: 'var(--text-muted)', padding: '2rem 0', fontSize: '0.9rem' } as React.CSSProperties,
  warningList: { listStyle: 'none', padding: 0, margin: '0.5rem 0 0' } as React.CSSProperties,
  warningItem: { fontSize: '0.8rem', color: 'var(--warning)', padding: '0.15rem 0' } as React.CSSProperties,
  safeBanner: {
    background: 'rgba(52,211,153,0.08)',
    border: '1px solid rgba(52,211,153,0.2)',
    borderRadius: '4px',
    padding: '0.5rem 0.75rem',
    color: 'var(--success)',
    fontSize: '0.8rem',
    fontWeight: 500,
  } as React.CSSProperties,
};

function statusIcon(status: DiagnosticCheck['status']): string {
  const icons: Record<string, string> = {
    ok: '\u2713',
    warning: '!',
    error: '\u2717',
    unknown: '?',
  };
  return icons[status] ?? '?';
}

export function Diagnostics() {
  const api = useApi();
  const [data, setData] = useState<SafeDiagnosticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const result = await api.getDiagnostics(ac.signal);
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
    return <div style={s.loading}>Running diagnostics…</div>;
  }

  if (error) {
    return <div style={s.error}>Failed to run diagnostics. {error}</div>;
  }

  if (!data || data.checks.length === 0) {
    return (
      <div style={s.page}>
        <h1 style={s.title}>Diagnostics</h1>
        <div style={s.empty}>No diagnostic checks available.</div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <h1 style={s.title}>Diagnostics</h1>

      <div style={s.safeBanner}>
        All checks are read-only and non-destructive. No service state is modified.
      </div>

      {/* Meta */}
      <div style={s.card}>
        <div style={s.sectionTitle}>Run Info</div>
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

      {/* Checks */}
      <div>
        <div style={s.sectionTitle}>Checks ({data.checks.length})</div>
        <ul style={s.checkList}>
          {data.checks.map((check) => (
            <li key={check.id} style={s.checkItem}>
              <div style={s.checkIcon(check.status)}>
                {statusIcon(check.status)}
              </div>
              <div style={s.checkBody}>
                <div style={s.checkLabel}>{check.label}</div>
                <div style={s.checkSummary}>{check.summary}</div>
                {check.details && (
                  <pre style={s.checkDetails}>{check.details}</pre>
                )}
              </div>
            </li>
          ))}
        </ul>
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
