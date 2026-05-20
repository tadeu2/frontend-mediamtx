import { readFileSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export interface AppSettings {
  mediamtxApiUrl: string;
  mediamtxApiUsername: string;
  mediamtxApiPassword: string;
  mediamtxMetricsUrl: string;
  mediamtxConfigPath: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  mediamtxApiUrl: 'http://127.0.0.1:9997',
  mediamtxApiUsername: '',
  mediamtxApiPassword: '',
  mediamtxMetricsUrl: 'http://127.0.0.1:9998/metrics',
  mediamtxConfigPath: '/etc/mediamtx/mediamtx.yml',
};

type SettingsPartial = { [K in keyof AppSettings]?: AppSettings[K] };

export class SettingsManager {
  private settings: AppSettings;
  private readonly filePath: string;

  constructor(filePath?: string, envOverrides?: SettingsPartial) {
    this.filePath = filePath ?? resolve(process.cwd(), 'settings.json');
    this.settings = { ...DEFAULT_SETTINGS };

    if (existsSync(this.filePath)) {
      try {
        const raw = readFileSync(this.filePath, 'utf8');
        const data = JSON.parse(raw) as SettingsPartial;
        this.merge(data);
      } catch { /* ignore corrupt files */ }
    }

    if (envOverrides) this.merge(envOverrides);
  }

  get(): AppSettings {
    return { ...this.settings };
  }

  getRedacted(): AppSettings {
    return {
      ...this.settings,
      mediamtxApiPassword: this.settings.mediamtxApiPassword ? '••••••••' : '',
    };
  }

  async update(partial: SettingsPartial): Promise<AppSettings> {
    this.merge(partial);
    await writeFile(this.filePath, JSON.stringify(this.settings, null, 2), 'utf8');
    return this.getRedacted();
  }

  getCredentials(): { username: string; password: string } {
    return {
      username: this.settings.mediamtxApiUsername,
      password: this.settings.mediamtxApiPassword,
    };
  }

  private merge(partial: SettingsPartial): void {
    for (const [key, value] of Object.entries(partial)) {
      if (value !== undefined && value !== null) {
        (this.settings as unknown as Record<string, string>)[key] = String(value);
      }
    }
  }
}
