import { useState } from 'react';
import { useAuth } from '../api/AuthContext';

const s: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: 'var(--bg)',
  },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '2.5rem',
    maxWidth: 400,
    width: '100%',
    margin: '1rem',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: 'var(--text)',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    marginBottom: '1.5rem',
    lineHeight: 1.5,
  },
  input: {
    width: '100%',
    padding: '0.6rem 0.75rem',
    fontSize: '0.875rem',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    color: 'var(--text)',
    outline: 'none',
    marginBottom: '1rem',
  },
  button: {
    width: '100%',
    padding: '0.6rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};

export function Login() {
  const { login, authError } = useAuth();
  const [tokenInput, setTokenInput] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = tokenInput.trim();
    if (trimmed.length === 0) return;
    login(trimmed);
  }

  return (
    <div style={s.wrapper}>
      <div style={s.card}>
        <h1 style={s.title}>Admin Authentication Required</h1>
        <p style={s.subtitle}>
          This admin interface requires an authentication token.
          Enter your <code>ADMIN_AUTH_TOKEN</code> below to continue.
        </p>
        {authError && (
          <div style={{
            background: 'rgba(248,113,113,0.1)',
            border: '1px solid rgba(248,113,113,0.25)',
            borderRadius: '6px',
            padding: '0.6rem 0.75rem',
            color: 'var(--error)',
            fontSize: '0.85rem',
            marginBottom: '1rem',
            lineHeight: 1.4,
          }}>
            {authError}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <input
            style={s.input}
            type="password"
            placeholder="Paste your admin token…"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            autoFocus
          />
          <button type="submit" style={s.button}>
            Authenticate
          </button>
        </form>
      </div>
    </div>
  );
}
