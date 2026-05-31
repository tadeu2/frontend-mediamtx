import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('API client shared contract usage', () => {
  it('imports shared status/settings response DTOs', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/api/client.ts'), 'utf8');

    expect(source).toContain('ServiceStatusResponse');
    expect(source).toContain('SettingsStatusResponse');
  });

  it('does not keep local duplicate response interfaces', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/api/client.ts'), 'utf8');

    expect(source).not.toContain('interface ServiceStatusResponse');
    expect(source).not.toContain('export interface SettingsStatusResponse');
  });
});
