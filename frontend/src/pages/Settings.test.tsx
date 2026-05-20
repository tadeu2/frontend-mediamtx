import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ApiContext } from '../api/ApiContext';
import { Settings } from './Settings';
import { createMockApi } from '../test/mockApi';

function wrap(api: ReturnType<typeof createMockApi>) {
  return render(
    <ApiContext.Provider value={api}>
      <Settings />
    </ApiContext.Provider>
  );
}

const mockSettingsStatus = {
  generatedAt: new Date().toISOString(),
  bindAddress: '127.0.0.1',
  port: 9088,
  mediamtxApiUrl: 'http://127.0.0.1:9997',
  mediamtxMetricsUrl: 'http://127.0.0.1:9998/metrics',
  mediamtxConfigPath: '/etc/mediamtx/mediamtx.yml',
  authEnabled: true,
  mediamtxApiUsernameConfigured: false,
  mediamtxApiPasswordConfigured: true,
  adminAuthTokenConfigured: true,
  mediamtxApiReachable: true,
  metricsReachable: false,
};

const mockFetch = vi.fn();

describe('Settings (read-only status panel)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock global fetch for /api/settings
    globalThis.fetch = mockFetch;
  });

  it('renders loading state initially', () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // never resolves
    wrap(createMockApi());
    expect(screen.getByText('Loading settings…')).toBeInTheDocument();
  });

  it('renders error state on fetch failure', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    wrap(createMockApi());

    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });

  it('renders the status panel with config values', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSettingsStatus),
    });
    wrap(createMockApi());

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    // Shows bind address and port
    expect(screen.getByText('127.0.0.1')).toBeInTheDocument();
    expect(screen.getByText('9088')).toBeInTheDocument();

    // Shows URLs (sanitised)
    expect(screen.getByText(/http:\/\/127\.0\.0\.1:9997/)).toBeInTheDocument();

    // Shows config path
    expect(screen.getByText('/etc/mediamtx/mediamtx.yml')).toBeInTheDocument();

    // Shows boolean flags (not secrets)
    expect(screen.getByText(/auth enabled/i)).toBeInTheDocument();
  });

  it('shows "configured" indicator when password is set', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSettingsStatus),
    });
    wrap(createMockApi());

    await waitFor(() => {
      expect(screen.getByText(/api password configured/i)).toBeInTheDocument();
    });
  });

  it('shows "not configured" indicator when username is not set', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSettingsStatus),
    });
    wrap(createMockApi());

    await waitFor(() => {
      expect(screen.getByText(/api username not configured/i)).toBeInTheDocument();
    });
  });

  it('shows reachability status', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSettingsStatus),
    });
    wrap(createMockApi());

    await waitFor(() => {
      expect(screen.getByText(/mediamtx api reachable/i)).toBeInTheDocument();
      expect(screen.getByText(/metrics unreachable/i)).toBeInTheDocument();
    });
  });

  it('does NOT render any form inputs or save buttons', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSettingsStatus),
    });
    wrap(createMockApi());

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    // No inputs for passwords or usernames
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/username/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/unchanged/i)).not.toBeInTheDocument();
  });

  it('shows read-only banner', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSettingsStatus),
    });
    wrap(createMockApi());

    await waitFor(() => {
      expect(screen.getByText(/configuration is managed via/i)).toBeInTheDocument();
    });
  });
});
