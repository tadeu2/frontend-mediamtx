interface PathItem {
  name: string;
  confName: string;
  available: boolean;
  online: boolean;
}

interface PathsListResponse {
  pageCount: number;
  itemCount: number;
  items: PathItem[];
}

interface GlobalConfigResponse {
  [key: string]: unknown;
}

export interface MediaMTXClient {
  readonly baseUrl: string;
  isAvailable(): Promise<boolean>;
  fetchPaths(): Promise<PathsListResponse>;
  fetchGlobalConfig(): Promise<GlobalConfigResponse>;
}

export function createMediaMTXClient(baseUrl: string): MediaMTXClient {
  async function request<T>(path: string): Promise<T | null> {
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        method: 'GET',
        signal: AbortSignal.timeout(3_000),
      });
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      return null;
    }
  }

  return {
    baseUrl,

    async isAvailable(): Promise<boolean> {
      const data = await request<GlobalConfigResponse>('/v3/config/global/get');
      return data !== null && typeof data === 'object';
    },

    async fetchPaths(): Promise<PathsListResponse> {
      const data = await request<PathsListResponse>('/v3/paths/list');
      return data ?? { pageCount: 0, itemCount: 0, items: [] };
    },

    async fetchGlobalConfig(): Promise<GlobalConfigResponse> {
      return (await request<GlobalConfigResponse>('/v3/config/global/get')) ?? {};
    },
  };
}
