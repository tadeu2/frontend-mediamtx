import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ApiContext } from '../api/ApiContext';
import { Diagnostics } from './Diagnostics';
import { createMockApi } from '../test/mockApi';
import type { SafeDiagnosticsResponse } from '../../../shared/admin-api';

function wrap(api: ReturnType<typeof createMockApi>) {
  return render(
    <ApiContext.Provider value={api}>
      <Diagnostics />
    </ApiContext.Provider>
  );
}

const mockSuccess: SafeDiagnosticsResponse = {
  generatedAt: new Date().toISOString(),
  source: 'api',
  checks: [
    { id: 'cfg', label: 'Config file readable', status: 'ok', summary: '/etc/mediamtx/mediamtx.yml exists and is readable' },
    { id: 'api', label: 'API endpoint reachable', status: 'ok', summary: 'MediaMTX API responded in 12ms' },
    { id: 'disk', label: 'Disk space sufficient', status: 'warning', summary: '87% used — monitor closely', details: '/dev/sda1: 87% (13.3G / 100G)' },
  ],
  warnings: [],
};

describe('Diagnostics', () => {
  it('renders loading state', () => {
    const api = createMockApi();
    wrap(api);
    expect(screen.getByText('Running diagnostics…')).toBeInTheDocument();
  });

  it('renders error state on API failure', async () => {
    const api = createMockApi();
    api.getDiagnostics.mockRejectedValue(new Error('Diagnostic runner crashed'));

    wrap(api);

    await waitFor(() => {
      expect(screen.getByText(/Failed to run diagnostics/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Diagnostic runner crashed/)).toBeInTheDocument();
  });

  it('renders empty state when no checks', async () => {
    const api = createMockApi();
    api.getDiagnostics.mockResolvedValue({
      generatedAt: new Date().toISOString(),
      source: 'api',
      checks: [],
      warnings: [],
    });

    wrap(api);

    await waitFor(() => {
      expect(screen.getByText('No diagnostic checks available.')).toBeInTheDocument();
    });
  });

  it('renders diagnostic checks with status icons', async () => {
    const api = createMockApi();
    api.getDiagnostics.mockResolvedValue(mockSuccess);

    wrap(api);

    await waitFor(() => {
      expect(screen.getByText('Diagnostics')).toBeInTheDocument();
    });
    // Safe banner
    expect(screen.getByText(/All checks are read-only/i)).toBeInTheDocument();
    // Checks
    expect(screen.getByText('Config file readable')).toBeInTheDocument();
    expect(screen.getByText('API endpoint reachable')).toBeInTheDocument();
    expect(screen.getByText('Disk space sufficient')).toBeInTheDocument();
    // Check count
    expect(screen.getByText('Checks (3)')).toBeInTheDocument();
  });

  it('shows check details when provided', async () => {
    const api = createMockApi();
    api.getDiagnostics.mockResolvedValue(mockSuccess);

    wrap(api);

    await waitFor(() => {
      expect(screen.getByText(/\/dev\/sda1: 87%/)).toBeInTheDocument();
    });
  });
});
