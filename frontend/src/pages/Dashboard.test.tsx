import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ApiContext } from '../api/ApiContext';
import { Dashboard } from './Dashboard';
import { createMockApi } from '../test/mockApi';
import type { HealthResponse, StreamsResponse } from '../../../shared/admin-api';

function wrap(api: ReturnType<typeof createMockApi>) {
  return render(
    <ApiContext.Provider value={api}>
      <Dashboard />
    </ApiContext.Provider>
  );
}

describe('Dashboard', () => {
  it('renders loading state initially', () => {
    const api = createMockApi();
    // Default: all methods return never-resolving promises → stays loading
    wrap(api);
    expect(screen.getByText('Loading dashboard data…')).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    const api = createMockApi();
    api.getHealth.mockRejectedValue(new Error('Connection refused'));

    wrap(api);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load dashboard/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Connection refused/)).toBeInTheDocument();
  });

  it('renders dashboard data when all APIs succeed', async () => {
    const api = createMockApi();
    const health: HealthResponse = {
      ok: true,
      service: 'mediamtx-admin-ui',
      generatedAt: new Date().toISOString(),
      source: 'api',
    };
    const status = {
      generatedAt: new Date().toISOString(),
      source: 'systemd',
      service: {
        unit: 'mediamtx.service',
        active: true,
        state: 'running',
        uptimeSeconds: 3720,
        version: '1.10.0',
      },
      warnings: [],
    };
    const streams: StreamsResponse = {
      generatedAt: new Date().toISOString(),
      source: 'api',
      total: 4,
      items: [],
    };

    api.getHealth.mockResolvedValue(health);
    api.getStatus.mockResolvedValue(status);
    api.getStreams.mockResolvedValue(streams);

    wrap(api);

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
    expect(screen.getByText('OK')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    // '4' appears in both the overview card and Total Paths stat
    expect(screen.getAllByText('4').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('1h 2m')).toBeInTheDocument();
  });

  it('renders unavailable message when no streams exist', async () => {
    const api = createMockApi();
    api.getHealth.mockResolvedValue({
      ok: true,
      service: 'mediamtx-admin-ui',
      generatedAt: new Date().toISOString(),
      source: 'api',
    });
    api.getStatus.mockResolvedValue({
      generatedAt: new Date().toISOString(),
      source: 'systemd',
      service: {
        unit: 'mediamtx.service',
        active: true,
        state: 'running',
        uptimeSeconds: 0,
      },
      warnings: [],
    });
    api.getStreams.mockResolvedValue({
      generatedAt: new Date().toISOString(),
      source: 'api',
      total: 0,
      items: [],
    });

    wrap(api);

    await waitFor(() => {
      expect(screen.getByText('No active streams or paths.')).toBeInTheDocument();
    });
  });

  it('renders warnings when present', async () => {
    const api = createMockApi();
    api.getHealth.mockResolvedValue({
      ok: true,
      service: 'mediamtx-admin-ui',
      generatedAt: new Date().toISOString(),
      source: 'fallback',
    });
    api.getStatus.mockResolvedValue({
      generatedAt: new Date().toISOString(),
      source: 'fallback',
      service: {
        unit: 'mediamtx.service',
        active: false,
        state: 'inactive',
      },
      warnings: ['Status data is stale', 'Cannot reach systemd'],
    });
    api.getStreams.mockResolvedValue({
      generatedAt: new Date().toISOString(),
      source: 'api',
      total: 0,
      items: [],
    });

    wrap(api);

    await waitFor(() => {
      expect(screen.getByText('Status data is stale')).toBeInTheDocument();
    });
    expect(screen.getByText('Cannot reach systemd')).toBeInTheDocument();
  });
});
