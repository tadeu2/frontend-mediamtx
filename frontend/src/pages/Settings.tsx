import { useState, useEffect } from 'react';
import { useApi } from '../api/ApiContext';

interface SettingsData {
  mediamtxApiUrl: string;
  mediamtxApiUsername: string;
  mediamtxApiPassword: string;
  mediamtxMetricsUrl: string;
  mediamtxConfigPath: string;
}

export function Settings() {
  const api = useApi();
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [form, setForm] = useState<SettingsData>({
    mediamtxApiUrl: '',
    mediamtxApiUsername: '',
    mediamtxApiPassword: '',
    mediamtxMetricsUrl: '',
    mediamtxConfigPath: '',
  });
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const s = data.settings as SettingsData;
        setSettings(s);
        setForm({ ...s, mediamtxApiPassword: '' });
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);

    const body: Record<string, string> = {};
    if (form.mediamtxApiUrl !== settings?.mediamtxApiUrl) body.mediamtxApiUrl = form.mediamtxApiUrl;
    if (form.mediamtxApiUsername !== settings?.mediamtxApiUsername) body.mediamtxApiUsername = form.mediamtxApiUsername;
    if (newPassword) body.mediamtxApiPassword = newPassword;
    if (form.mediamtxMetricsUrl !== settings?.mediamtxMetricsUrl) body.mediamtxMetricsUrl = form.mediamtxMetricsUrl;
    if (form.mediamtxConfigPath !== settings?.mediamtxConfigPath) body.mediamtxConfigPath = form.mediamtxConfigPath;

    if (Object.keys(body).length === 0) {
      setSaveMsg('No changes to save.');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      const data = await res.json();
      setSettings(data.settings as SettingsData);
      setForm({ ...data.settings as SettingsData, mediamtxApiPassword: '' });
      setNewPassword('');
      setSaveMsg('Settings saved successfully.');
    } catch (e: unknown) {
      setSaveMsg(`Error: ${(e as Error).message}`);
    }
    setSaving(false);
  }

  if (loading) return <div className="page-status">Loading settings…</div>;
  if (error) return <div className="page-status page-status--error">Error: {error}</div>;

  return (
    <div>
      <h2 className="page-title">Settings</h2>
      <p className="page-subtitle">Configure MediaMTX API and services connection.</p>

      <form onSubmit={handleSave} style={{ maxWidth: 560, marginTop: '1.5rem' }}>
        <div className="form-group">
          <label className="form-label">MediaMTX API URL</label>
          <input className="form-input" value={form.mediamtxApiUrl}
            onChange={(e) => setForm({ ...form, mediamtxApiUrl: e.target.value })} />
        </div>

        <div className="form-group">
          <label className="form-label">API Username</label>
          <input className="form-input" value={form.mediamtxApiUsername}
            onChange={(e) => setForm({ ...form, mediamtxApiUsername: e.target.value })} />
        </div>

        <div className="form-group">
          <label className="form-label">API Password</label>
          <input className="form-input" type="password" placeholder="(unchanged)" value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Metrics URL</label>
          <input className="form-input" value={form.mediamtxMetricsUrl}
            onChange={(e) => setForm({ ...form, mediamtxMetricsUrl: e.target.value })} />
        </div>

        <div className="form-group">
          <label className="form-label">Config File Path</label>
          <input className="form-input" value={form.mediamtxConfigPath}
            onChange={(e) => setForm({ ...form, mediamtxConfigPath: e.target.value })} />
        </div>

        <button type="submit" className="btn" disabled={saving}>
          {saving ? 'Saving…' : 'Save Settings'}
        </button>

        {saveMsg && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.875rem',
            color: saveMsg.startsWith('Error') ? 'var(--error)' : 'var(--success)' }}>
            {saveMsg}
          </p>
        )}
      </form>
    </div>
  );
}
