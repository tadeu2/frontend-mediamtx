import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ApiContext } from '../api/ApiContext';
import { Config } from './Config';
import { createMockApi } from '../test/mockApi';
import type { ConfigView } from '../../../shared/admin-api';

function wrap(api: ReturnType<typeof createMockApi>) {
  return render(
    <ApiContext.Provider value={api}>
      <Config />
    </ApiContext.Provider>
  );
}

const mockSuccess: ConfigView = {
  generatedAt: new Date().toISOString(),
  source: 'config',
  available: true,
  path: '/etc/mediamtx/mediamtx.yml',
  redactedYaml: 'api: yes\nmetrics: yes\npaths:\n  cam1:\n    source: rtsp://***',
  flags: {
    apiEnabled: true,
    metricsEnabled: true,
    pprofEnabled: false,
  },
  warnings: [],
};

describe('Config', () => {
  it('renders loading state', () => {
    const api = createMockApi();
    wrap(api);
    expect(screen.getByText('Loading configuration…')).toBeInTheDocument();
  });

  it('renders error state on API failure', async () => {
    const api = createMockApi();
    api.getConfig.mockRejectedValue(new Error('Permission denied'));

    wrap(api);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load configuration/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Permission denied/)).toBeInTheDocument();
  });

  it('renders unavailable state when config is not available', async () => {
    const api = createMockApi();
    api.getConfig.mockResolvedValue({
      generatedAt: new Date().toISOString(),
      source: 'unavailable',
      available: false,
      redactedYaml: '',
      flags: { apiEnabled: false, metricsEnabled: false, pprofEnabled: false },
      warnings: ['Config file not found'],
    });

    wrap(api);

    await waitFor(() => {
      expect(screen.getByText('Configuration is currently unavailable.')).toBeInTheDocument();
    });
    expect(screen.getByText('Config file not found')).toBeInTheDocument();
  });

  it('renders configuration view with flags and YAML', async () => {
    const api = createMockApi();
    api.getConfig.mockResolvedValue(mockSuccess);

    wrap(api);

    await waitFor(() => {
      expect(screen.getByText('Configuration')).toBeInTheDocument();
    });
    // Read-only banner
    expect(screen.getByText(/This view is read-only/i)).toBeInTheDocument();
    // Feature flags
    expect(screen.getByText('API ENABLED')).toBeInTheDocument();
    expect(screen.getByText('METRICS ENABLED')).toBeInTheDocument();
    expect(screen.getByText('PPROF DISABLED')).toBeInTheDocument();
    // YAML content
    expect(screen.getByText(/api: yes/)).toBeInTheDocument();
  });

  it('shows flag badges correctly for disabled flags', async () => {
    const api = createMockApi();
    api.getConfig.mockResolvedValue({
      ...mockSuccess,
      flags: { apiEnabled: false, metricsEnabled: false, pprofEnabled: false },
    });

    wrap(api);

    await waitFor(() => {
      expect(screen.getByText('API DISABLED')).toBeInTheDocument();
      expect(screen.getByText('METRICS DISABLED')).toBeInTheDocument();
      expect(screen.getByText('PPROF DISABLED')).toBeInTheDocument();
    });
  });
});
