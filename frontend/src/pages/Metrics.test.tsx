import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ApiContext } from '../api/ApiContext';
import { Metrics } from './Metrics';
import { createMockApi } from '../test/mockApi';
import type { MetricsSummary } from '../../../shared/admin-api';

function wrap(api: ReturnType<typeof createMockApi>) {
  return render(
    <ApiContext.Provider value={api}>
      <Metrics />
    </ApiContext.Provider>
  );
}

const mockSuccess: MetricsSummary = {
  generatedAt: new Date().toISOString(),
  source: 'metrics',
  available: true,
  totals: {
    paths: 3,
    bytesReceived: 1048576,
    bytesSent: 2097152,
  },
  protocols: {
    rtsp: { connections: 5, sessions: 3, muxers: 1, bytesReceived: 524288, bytesSent: 1048576 },
    webrtc: { connections: 2, sessions: 2, muxers: 1, bytesReceived: 262144, bytesSent: 524288 },
  },
  warnings: [],
};

describe('Metrics', () => {
  it('renders loading state', () => {
    const api = createMockApi();
    wrap(api);
    expect(screen.getByText('Loading metrics…')).toBeInTheDocument();
  });

  it('renders error state on API failure', async () => {
    const api = createMockApi();
    api.getMetrics.mockRejectedValue(new Error('Metrics unavailable'));

    wrap(api);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load metrics/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Metrics unavailable/)).toBeInTheDocument();
  });

  it('renders unavailable state when not available', async () => {
    const api = createMockApi();
    api.getMetrics.mockResolvedValue({
      generatedAt: new Date().toISOString(),
      source: 'unavailable',
      available: false,
      totals: {},
      protocols: {},
      warnings: ['Metrics endpoint returned 404'],
    });

    wrap(api);

    await waitFor(() => {
      expect(screen.getByText('Metrics data is currently unavailable.')).toBeInTheDocument();
    });
    expect(screen.getByText('Metrics endpoint returned 404')).toBeInTheDocument();
  });

  it('renders metrics with protocol breakdown', async () => {
    const api = createMockApi();
    api.getMetrics.mockResolvedValue(mockSuccess);

    wrap(api);

    await waitFor(() => {
      expect(screen.getByText('Metrics')).toBeInTheDocument();
    });
    // '3' appears in both Paths total and RTSP Sessions
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('RTSP')).toBeInTheDocument();
    expect(screen.getByText('WebRTC')).toBeInTheDocument();
  });

  it('renders totals with formatted bytes', async () => {
    const api = createMockApi();
    api.getMetrics.mockResolvedValue(mockSuccess);

    wrap(api);

    await waitFor(() => {
      expect(screen.getByText('Totals')).toBeInTheDocument();
    });
    // 1048576 bytes = 1.0 MB — appears in both totals (Rx) and RTSP Tx
    expect(screen.getAllByText('1.0 MB').length).toBeGreaterThanOrEqual(1);
    // 2097152 bytes = 2.0 MB
    expect(screen.getByText('2.0 MB')).toBeInTheDocument();
  });
});
