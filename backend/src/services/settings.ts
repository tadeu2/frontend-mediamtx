/**
 * SettingsManager — read-only config status.
 *
 * Settings are configured ONLY via environment variables (backend/.env).
 * This service exposes a read-only view of the current effective config
 * with secrets redacted and reachability metadata.
 *
 * There is no PATCH, no settings.json persistence, no mutation.
 */

import { createMediaMTXClient } from './mediamtx-api';

export interface SettingsStatus {
  generatedAt: string;
  bindAddress: string;
  port: number;
  mediamtxApiUrl: string;
  mediamtxMetricsUrl: string;
  mediamtxConfigPath: string;
  authEnabled: boolean;
  mediamtxApiUsernameConfigured: boolean;
  mediamtxApiPasswordConfigured: boolean;
  adminAuthTokenConfigured: boolean;
  mediamtxApiReachable: boolean;
  metricsReachable: boolean;
}

function now(): string {
  return new Date().toISOString();
}

/** Strip userinfo (username:password@) from a URL string. */
export function stripUserinfo(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password) {
      parsed.username = '';
      parsed.password = '';
      return parsed.toString();
    }
    return url;
  } catch {
    return url;
  }
}

export class SettingsManager {
  private readonly bindAddress: string;
  private readonly port: number;
  private readonly mediamtxApiUrl: string;
  private readonly mediamtxApiUsername: string;
  private readonly mediamtxApiPassword: string;
  private readonly mediamtxMetricsUrl: string;
  private readonly mediamtxConfigPath: string;
  private readonly authTokenConfigured: boolean;

  constructor(config: {
    host: string;
    port: number;
    mediamtxApiUrl: string;
    mediamtxApiUsername?: string;
    mediamtxApiPassword?: string;
    mediamtxMetricsUrl: string;
    mediamtxConfigPath: string;
    authToken?: string;
  }) {
    this.bindAddress = config.host;
    this.port = config.port;
    this.mediamtxApiUrl = config.mediamtxApiUrl;
    this.mediamtxApiUsername = config.mediamtxApiUsername ?? '';
    this.mediamtxApiPassword = config.mediamtxApiPassword ?? '';
    this.mediamtxMetricsUrl = config.mediamtxMetricsUrl;
    this.mediamtxConfigPath = config.mediamtxConfigPath;
    this.authTokenConfigured = !!config.authToken;
  }

  /** Return the current effective config with secrets redacted. */
  get(): {
    mediamtxApiUrl: string;
    mediamtxApiUsername: string;
    mediamtxApiPassword: string;
    mediamtxMetricsUrl: string;
    mediamtxConfigPath: string;
  } {
    return {
      mediamtxApiUrl: this.mediamtxApiUrl,
      mediamtxApiUsername: this.mediamtxApiUsername,
      mediamtxApiPassword: this.mediamtxApiPassword,
      mediamtxMetricsUrl: this.mediamtxMetricsUrl,
      mediamtxConfigPath: this.mediamtxConfigPath,
    };
  }

  /** Return a redacted view (password masked). */
  getRedacted(): {
    mediamtxApiUrl: string;
    mediamtxApiUsername: string;
    mediamtxApiPassword: string;
    mediamtxMetricsUrl: string;
    mediamtxConfigPath: string;
  } {
    return {
      ...this.get(),
      mediamtxApiPassword: this.mediamtxApiPassword ? '••••••••' : '',
    };
  }

  /** Return config status with reachability checks and all secrets excluded. */
  async getStatus(): Promise<SettingsStatus> {
    const mtxClient = createMediaMTXClient(
      this.mediamtxApiUrl,
      this.mediamtxApiUsername,
      this.mediamtxApiPassword,
    );

    const [apiReachable, metricsReachable] = await Promise.all([
      mtxClient.isAvailable(),
      this.checkMetricsReachable(),
    ]);

    return {
      generatedAt: now(),
      bindAddress: this.bindAddress,
      port: this.port,
      mediamtxApiUrl: stripUserinfo(this.mediamtxApiUrl),
      mediamtxMetricsUrl: stripUserinfo(this.mediamtxMetricsUrl),
      mediamtxConfigPath: this.mediamtxConfigPath,
      authEnabled: this.authTokenConfigured,
      mediamtxApiUsernameConfigured: this.mediamtxApiUsername.length > 0,
      mediamtxApiPasswordConfigured: this.mediamtxApiPassword.length > 0,
      adminAuthTokenConfigured: this.authTokenConfigured,
      mediamtxApiReachable: apiReachable,
      metricsReachable,
    };
  }

  /** Return the MediaMTX API credentials for the admin routes. */
  getCredentials(): { username: string; password: string } {
    return {
      username: this.mediamtxApiUsername,
      password: this.mediamtxApiPassword,
    };
  }

  private async checkMetricsReachable(): Promise<boolean> {
    try {
      const headers: Record<string, string> = {};
      if (this.mediamtxApiUsername && this.mediamtxApiPassword) {
        headers['Authorization'] = 'Basic ' + Buffer.from(`${this.mediamtxApiUsername}:${this.mediamtxApiPassword}`).toString('base64');
      }
      const res = await fetch(this.mediamtxMetricsUrl, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(3_000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
