import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

describe('Shared admin API contract alignment', () => {
  it('defines status/settings DTOs in shared contract', async () => {
    const sharedPath = resolve(process.cwd(), '../shared/admin-api.ts');
    const source = await readFile(sharedPath, 'utf8');

    assert.ok(source.includes('export interface ServiceStatusResponse'));
    assert.ok(source.includes('export interface SettingsStatusResponse'));
  });

  it('uses shared status response type in backend route', async () => {
    const routePath = resolve(process.cwd(), 'src/routes/admin.ts');
    const source = await readFile(routePath, 'utf8');

    assert.ok(source.includes('Promise<ServiceStatusResponse>'));
    assert.ok(!source.includes('Promise<{ generatedAt: string; source: string; service: ServiceStatus; warnings?: string[] }>'));
  });
});
