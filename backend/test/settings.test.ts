import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';
import { createTestServer } from './_helpers';

const TEST_TOKEN = 'test-secret-token';

function authHeader() {
  return { authorization: `Bearer ${TEST_TOKEN}` };
}

describe('Settings endpoint (status-only, read-only)', { concurrency: 1 }, () => {
  let app: FastifyInstance;

  before(async () => {
    app = await createTestServer({ authToken: TEST_TOKEN });
  });

  after(async () => {
    await app.close();
  });

  describe('GET /api/settings returns status info', () => {
    it('returns 200 with Bearer token and correct shape', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/settings',
        headers: authHeader(),
      });
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.ok(typeof body.generatedAt === 'string');
      assert.ok(body.generatedAt.length > 0);

      // Must NOT contain secrets
      assert.equal(body.mediamtxApiPassword, undefined, 'must not expose password');
      assert.equal(body.mediamtxApiUsername, undefined, 'must not expose username');
      assert.equal(body.adminAuthToken, undefined, 'must not expose auth token');

      // Must contain configuration flags
      assert.equal(typeof body.authEnabled, 'boolean');
      assert.equal(typeof body.mediamtxApiUrl, 'string');
      assert.equal(typeof body.mediamtxMetricsUrl, 'string');
      assert.equal(typeof body.mediamtxConfigPath, 'string');
      assert.equal(typeof body.mediamtxApiUsernameConfigured, 'boolean');
      assert.equal(typeof body.mediamtxApiPasswordConfigured, 'boolean');
      assert.equal(typeof body.adminAuthTokenConfigured, 'boolean');
    });

    it('returns authEnabled=true when token is configured', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/settings',
        headers: authHeader(),
      });
      const body = JSON.parse(res.payload);
      assert.equal(body.authEnabled, true);
      assert.equal(body.adminAuthTokenConfigured, true);
    });

    it('sanitises URLs by removing userinfo', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/settings',
        headers: authHeader(),
      });
      const body = JSON.parse(res.payload);
      // URLs must not contain credentials
      assert.ok(!body.mediamtxApiUrl.includes('@'), 'API URL must not contain userinfo');
      assert.ok(!body.mediamtxMetricsUrl.includes('@'), 'Metrics URL must not contain userinfo');
    });
  });

  describe('GET /api/settings requires auth', () => {
    it('returns 401 without token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/settings' });
      assert.equal(res.statusCode, 401);
    });

    it('returns 401 with wrong token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/settings',
        headers: { authorization: 'Bearer wrong-token' },
      });
      assert.equal(res.statusCode, 401);
    });
  });

  describe('PATCH /api/settings is removed', () => {
    it('returns 404 when trying to PATCH', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/settings',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        payload: { mediamtxApiUrl: 'http://evil.com' },
      });
      assert.equal(res.statusCode, 404);
    });
  });

  describe('authEnabled is false when no admin_auth_token', () => {
    let noAuthApp: FastifyInstance;

    before(async () => {
      noAuthApp = await createTestServer();
    });

    after(async () => {
      await noAuthApp.close();
    });

    it('GET /api/settings returns authEnabled=false', async () => {
      const res = await noAuthApp.inject({ method: 'GET', url: '/api/settings' });
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.equal(body.authEnabled, false);
      assert.equal(body.adminAuthTokenConfigured, false);
    });
  });
});
