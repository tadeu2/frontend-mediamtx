import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';
import { createTestServer } from './_helpers';

const TEST_TOKEN = 'test-secret-token-4.1';

function authHeader() {
  return { authorization: `Bearer ${TEST_TOKEN}` };
}

/**
 * API route tests — server configured WITH auth token.
 * Covers: auth required, logs bounds, graceful degradation, safe diagnostics.
 */
describe('API routes (auth enabled)', { concurrency: 1 }, () => {
  let app: FastifyInstance;

  before(async () => {
    app = await createTestServer({ authToken: TEST_TOKEN });
  });

  after(async () => {
    await app.close();
  });

  // ── Auth required ──────────────────────────────────────────────

  describe('Auth required', () => {
    it('/healthz is exempt from auth', async () => {
      const res = await app.inject({ method: 'GET', url: '/healthz' });
      assert.equal(res.statusCode, 200);
    });

    it('/api/health returns 401 without token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/health' });
      assert.equal(res.statusCode, 401);
      const body = JSON.parse(res.payload);
      assert.equal(body.code, 'UNAUTHORIZED');
      assert.equal(body.message, 'Authentication required.');
    });

    it('/api/health returns 200 with correct Bearer token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/health',
        headers: authHeader()
      });
      assert.equal(res.statusCode, 200);
    });

    it('/api/health returns 401 with wrong Bearer token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/health',
        headers: { authorization: 'Bearer wrong-token' }
      });
      assert.equal(res.statusCode, 401);
      const body = JSON.parse(res.payload);
      assert.equal(body.code, 'UNAUTHORIZED');
    });

    it('/api/health returns 401 with malformed authorization', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/health',
        headers: { authorization: 'Basic dGVzdDp0ZXN0' }
      });
      assert.equal(res.statusCode, 401);
    });

    it('/api/status returns 401 without token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/status' });
      assert.equal(res.statusCode, 401);
    });

    it('/api/streams returns 401 without token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/streams' });
      assert.equal(res.statusCode, 401);
    });

    it('/api/logs returns 401 without token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/logs' });
      assert.equal(res.statusCode, 401);
    });

    it('/api/metrics returns 401 without token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/metrics' });
      assert.equal(res.statusCode, 401);
    });

    it('/api/config returns 401 without token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/config' });
      assert.equal(res.statusCode, 401);
    });

    it('/api/diagnostics/safe-check returns 401 without token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/diagnostics/safe-check'
      });
      assert.equal(res.statusCode, 401);
    });
  });

  // ── Logs bounds ────────────────────────────────────────────────

  describe('/api/logs lines param bounds', () => {
    it('treats lines=0 as default (0 is falsy → uses DEFAULT_LINES 100)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/logs?lines=0',
        headers: authHeader()
      });
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      // Current implementation treats 0 as falsy → falls back to DEFAULT_LINES (100)
      assert.equal(body.query.lines, 100);
    });

    it('clamps lines=999 to 300 (maximum)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/logs?lines=999',
        headers: authHeader()
      });
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.equal(body.query.lines, 300);
    });

    it('uses default of 100 when lines param is absent', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/logs',
        headers: authHeader()
      });
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.equal(body.query.lines, 100);
    });

    it('clamps negative lines to 1', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/logs?lines=-5',
        headers: authHeader()
      });
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.equal(body.query.lines, 1);
    });

    it('rejects non-numeric lines param gracefully (uses default)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/logs?lines=abc',
        headers: authHeader()
      });
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      // Number.parseInt('abc', 10) → NaN → treated as undefined → default 100
      assert.equal(body.query.lines, 100);
    });
  });

  // ── Graceful degradation ──────────────────────────────────────

  describe('Graceful degradation (unavailable upstream)', () => {
    it('/api/config returns unavailable when config file missing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/config',
        headers: authHeader()
      });
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.equal(body.source, 'unavailable');
      assert.equal(body.available, false);
      assert.ok(body.warnings.length > 0);
      assert.ok(body.warnings[0].includes('unavailable'));
      assert.equal(typeof body.path, 'string');
    });

    it('/api/status returns fallback when systemd unavailable', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/status',
        headers: authHeader()
      });
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.ok(typeof body.generatedAt === 'string');
      assert.ok(typeof body.source === 'string');
      assert.ok(body.service);
      assert.equal(typeof body.service.unit, 'string');
      assert.equal(typeof body.service.active, 'boolean');
      assert.equal(typeof body.service.state, 'string');
      // When systemctl is unavailable, state is 'unknown'
      if (body.service.state === 'unknown') {
        assert.ok(body.warnings && body.warnings.length > 0);
      }
    });

    it('/api/metrics returns unavailable when endpoint unreachable', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/metrics',
        headers: authHeader()
      });
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.ok(['unavailable', 'metrics'].includes(body.source));
      if (body.source === 'unavailable') {
        assert.equal(body.available, false);
        assert.ok(body.warnings.length > 0);
        assert.ok(body.warnings[0].includes('unavailable'));
      }
    });

    it('/api/streams returns empty fallback', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/streams',
        headers: authHeader()
      });
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.equal(body.total, 0);
      assert.ok(Array.isArray(body.items));
      assert.equal(body.items.length, 0);
      assert.equal(body.source, 'unavailable');
      assert.ok(typeof body.generatedAt === 'string');
    });

    it('/api/logs returns empty items when journalctl unavailable', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/logs',
        headers: authHeader()
      });
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.equal(body.source, 'unavailable');
      assert.equal(body.truncated, false);
      assert.ok(Array.isArray(body.items));
      assert.ok(typeof body.generatedAt === 'string');
    });
  });

  // ── Safe diagnostics ──────────────────────────────────────────

  describe('Safe diagnostics', () => {
    it('/api/diagnostics/safe-check returns only safe, read-only checks', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/diagnostics/safe-check',
        headers: authHeader()
      });
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.ok(Array.isArray(body.checks));
      assert.ok(body.checks.length > 0);

      for (const check of body.checks) {
        assert.ok(typeof check.id === 'string');
        assert.ok(typeof check.label === 'string');
        assert.ok(
          ['ok', 'warning', 'error', 'unknown'].includes(check.status)
        );
        assert.ok(typeof check.summary === 'string');
      }

      // Verify the read-only boundary check exists
      const boundaryCheck = body.checks.find(
        (c: { id: string }) => c.id === 'read-only-boundary'
      );
      assert.ok(boundaryCheck, 'read-only-boundary diagnostic check must exist');
      assert.equal(boundaryCheck.status, 'ok');
    });

    it('POST /api/diagnostics/safe-check returns 404 or 405 (no mutation allowed)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/diagnostics/safe-check',
        headers: authHeader()
      });
      assert.ok(
        res.statusCode === 404 || res.statusCode === 405,
        `Expected 404 or 405, got ${res.statusCode}`
      );
    });

    it('POST /api/config returns 404 or 405 (no mutation allowed)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/config',
        headers: authHeader()
      });
      assert.ok(
        res.statusCode === 404 || res.statusCode === 405,
        `Expected 404 or 405, got ${res.statusCode}`
      );
    });
  });
});
