import { useEffect, useState } from 'react';

interface SettingsStatus {
  generatedAt: string;
  bindAddress: string;
  port: number;
  mediamtxApiUrl: string;
  mediamtxMetricsUrl: string;
  mediamtxConfigPath: string;
  authEnabled: boolean;
  mediamtxApiUsernameConfigured: boolean;
  mediamtxApiPasswordConfigured: boolean;
  adminAuthTokenConfigured: boolean;
  mediamtxApiReachable: boolean;
  metricsReachable: boolean;
}

/* ---- inline styles ---- */

const card = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  padding: '1.25rem',
} as React.CSSProperties;

function badgeStyle(enabled: boolean): React.CSSProperties {
  return {
    display: 'inline-block',
    padding: '0.15rem 0.55rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 600,
    background: enabled ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
    color: enabled ? 'var(--success)' : 'var(--error)',
  };
}

function Badge({ enabled, label }: { enabled: boolean; label: string }) {
  return <span style={badgeStyle(enabled)}>{label}</span>;
}

export function Settings() {
  const [data, setData] = useState<SettingsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch('/api/settings')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        return r.json();
      })
      .then((d: SettingsStatus) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setError(e.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, []);

  if (loading) return <div style={{ color: 'var(--text-muted)', padding: '2rem 0' }}>Loading settings…</div>;
  if (error) return <div style={{ color: 'var(--error)', padding: '1rem 0' }}>Failed to load settings. {error}</div>;
  if (!data) return <div style={{ color: 'var(--error)', padding: '1rem 0' }}>No data received.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h1 style={{ fontSize: '1.35rem', fontWeight: 600, color: 'var(--text)' }}>Settings</h1>

      <div style={{
        background: 'rgba(52,211,153,0.08)',
        border: '1px solid rgba(52,211,153,0.2)',
        borderRadius: '4px',
        padding: '0.5rem 0.75rem',
        color: 'var(--success)',
        fontSize: '0.8rem',
        fontWeight: 500,
      }}>
        All configuration is managed via <code>backend/.env</code>.
        This view is read-only — no settings can be changed from the UI.
      </div>

      {/* Server info */}
      <div style={card}>
        <SectionTitle text="Server" />
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <Stat label="Bind Address" value={data.bindAddress} />
          <Stat label="Port" value={String(data.port)} />
          <Stat label="Auth Required">
            <Badge enabled={data.authEnabled} label={data.authEnabled ? 'AUTH ENABLED' : 'AUTH DISABLED'} />
          </Stat>
        </div>
      </div>

      {/* MediaMTX Connection */}
      <div style={card}>
        <SectionTitle text="MediaMTX Connection" />
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <Stat label="API URL" value={data.mediamtxApiUrl} />
          <Stat label="Metrics URL" value={data.mediamtxMetricsUrl} />
          <Stat label="Config Path" value={data.mediamtxConfigPath} />
        </div>
      </div>

      {/* Configuration Status */}
      <div style={card}>
        <SectionTitle text="Configuration Status" />
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Badge enabled={data.mediamtxApiUsernameConfigured} label={`API Username ${data.mediamtxApiUsernameConfigured ? 'Configured' : 'Not Configured'}`} />
          <Badge enabled={data.mediamtxApiPasswordConfigured} label={`API Password ${data.mediamtxApiPasswordConfigured ? 'Configured' : 'Not Configured'}`} />
          <Badge enabled={data.adminAuthTokenConfigured} label={`Admin Auth Token ${data.adminAuthTokenConfigured ? 'Configured' : 'Not Configured'}`} />
        </div>
      </div>

      {/* Reachability */}
      <div style={card}>
        <SectionTitle text="Service Reachability" />
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Badge enabled={data.mediamtxApiReachable} label={`MediaMTX API ${data.mediamtxApiReachable ? 'Reachable' : 'Unreachable'}`} />
          <Badge enabled={data.metricsReachable} label={`Metrics ${data.metricsReachable ? 'Reachable' : 'Unreachable'}`} />
        </div>
      </div>
    </div>
  );
}

/* ---- Sub-components ---- */

function SectionTitle({ text }: { text: string }) {
  return (
    <div style={{
      fontSize: '0.75rem',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      color: 'var(--text-muted)',
      marginBottom: '0.75rem',
    }}>
      {text}
    </div>
  );
}

function Stat({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div style={{ flex: '1 1 180px', minWidth: 0 }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{label}</div>
      {value !== undefined && <div style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text)', wordBreak: 'break-all' }}>{value}</div>}
      {children}
    </div>
  );
}
