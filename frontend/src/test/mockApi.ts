import { Mocked, vi } from 'vitest';
import type { ApiClient } from '../api/ApiContext';

/**
 * Creates a fully-mocked ApiClient where every method is a `vi.fn()`.
 * Returns `Mocked<ApiClient>` so TypeScript allows `.mockResolvedValue()`
 * and `.mockRejectedValue()` in tests.
 *
 * Default: each method returns a never-resolving promise (simulates loading).
 */
export function createMockApi(): Mocked<ApiClient> {
  const never = () => new Promise<never>(() => {});

  return {
    getHealth: vi.fn().mockImplementation(never),
    getStatus: vi.fn().mockImplementation(never),
    getStreams: vi.fn().mockImplementation(never),
    getLogs: vi.fn().mockImplementation(never),
    getMetrics: vi.fn().mockImplementation(never),
    getConfig: vi.fn().mockImplementation(never),
    getDiagnostics: vi.fn().mockImplementation(never),
  };
}
