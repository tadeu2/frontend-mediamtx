import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ApiContext } from '../api/ApiContext';
import { Logs } from './Logs';
import { createMockApi } from '../test/mockApi';
import type { LogsResponse } from '../../../shared/admin-api';

function wrap(api: ReturnType<typeof createMockApi>) {
  return render(
    <ApiContext.Provider value={api}>
      <Logs />
    </ApiContext.Provider>
  );
}

const mockSuccess: LogsResponse = {
  generatedAt: new Date().toISOString(),
  source: 'journalctl',
  truncated: false,
  query: { lines: 100 },
  items: [
    { timestamp: new Date().toISOString(), level: 'info', message: 'Service started', unit: 'mediamtx.service', cursor: 'c1' },
    { timestamp: new Date().toISOString(), level: 'warning', message: 'High memory usage', unit: 'mediamtx.service', cursor: 'c2' },
  ],
};

describe('Logs', () => {
  it('renders loading state', () => {
    const api = createMockApi();
    wrap(api);
    expect(screen.getByText('Loading logs…')).toBeInTheDocument();
  });

  it('renders error state on API failure', async () => {
    const api = createMockApi();
    api.getLogs.mockRejectedValue(new Error('Timeout'));

    wrap(api);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load logs/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Timeout/)).toBeInTheDocument();
  });

  it('renders unavailable state when source is unavailable', async () => {
    const api = createMockApi();
    api.getLogs.mockResolvedValue({
      generatedAt: new Date().toISOString(),
      source: 'unavailable',
      truncated: false,
      query: { lines: 100 },
      items: [],
    });

    wrap(api);

    await waitFor(() => {
      expect(screen.getByText('Log data is currently unavailable.')).toBeInTheDocument();
    });
  });

  it('renders empty state when no entries', async () => {
    const api = createMockApi();
    api.getLogs.mockResolvedValue({
      generatedAt: new Date().toISOString(),
      source: 'journalctl',
      truncated: false,
      query: { lines: 100 },
      items: [],
    });

    wrap(api);

    await waitFor(() => {
      expect(screen.getByText('No log entries found for the selected range.')).toBeInTheDocument();
    });
  });

  it('renders log entries table', async () => {
    const api = createMockApi();
    api.getLogs.mockResolvedValue(mockSuccess);

    wrap(api);

    await waitFor(() => {
      expect(screen.getByText('Logs')).toBeInTheDocument();
    });
    expect(screen.getByText('Service started')).toBeInTheDocument();
    expect(screen.getByText('High memory usage')).toBeInTheDocument();
    expect(screen.getByText(/2 entries/)).toBeInTheDocument();
  });

  it('shows truncated notice', async () => {
    const api = createMockApi();
    api.getLogs.mockResolvedValue({
      ...mockSuccess,
      truncated: true,
    });

    wrap(api);

    await waitFor(() => {
      expect(screen.getByText(/Log output was truncated/i)).toBeInTheDocument();
    });
  });
});
