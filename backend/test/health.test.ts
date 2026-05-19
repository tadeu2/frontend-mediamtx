import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';
import { createTestServer } from './_helpers';

/**
 * Health endpoint tests — no auth token configured.
 * Verifies that /healthz and /api/health are accessible.
 */
describe('Health endpoints (no auth)', { concurrency: 1 }, () => {
  let app: FastifyInstance;

  before(async () => {
    app = await createTestServer();
  });

  after(async () => {
    await app.close();
  });

  it('GET /healthz returns 200 with expected shape (no auth required)', async () => {
    const res = await app.inject({ method: 'GET', url: '/healthz' });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.ok, true);
    assert.equal(body.service, 'mediamtx-admin-backend');
    assert.ok(typeof body.generatedAt === 'string');
    assert.ok(body.generatedAt.length > 0);
  });

  it('GET /api/health returns 200 when no auth token is configured', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.ok, true);
    assert.equal(body.service, 'mediamtx-admin-ui');
    assert.ok(typeof body.source === 'string');
    assert.ok(['fallback'].includes(body.source));
    assert.ok(typeof body.generatedAt === 'string');
  });
});
