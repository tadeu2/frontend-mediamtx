import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { errorHandlerPlugin } from '../src/plugins/error-handler';

/**
 * Error handler normalization tests.
 * Verifies that errors are returned in the { code, message } shape
 * regardless of whether they are client or server errors.
 *
 * The plugin is called as a plain function (not via app.register()) so
 * setErrorHandler applies to routes on the root scope.
 */
describe('Error handler normalization', { concurrency: 1 }, () => {
  let app: FastifyInstance;

  before(async () => {
    app = Fastify({ logger: false });

    // Call as plain function — root scope shared
    await errorHandlerPlugin(app);

    // Test route that throws a client error (4xx)
    app.get('/throw-400', async () => {
      const err = new Error('Bad request');
      (err as Record<string, unknown>).statusCode = 400;
      throw err;
    });

    // Test route that throws a server error (5xx, no explicit statusCode)
    app.get('/throw-500', async () => {
      throw new Error('Boom!');
    });

    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  it('client errors return { code: REQUEST_ERROR, message: <error message> }', async () => {
    const res = await app.inject({ method: 'GET', url: '/throw-400' });
    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.payload);
    assert.equal(body.code, 'REQUEST_ERROR');
    assert.equal(body.message, 'Bad request');
  });

  it('server errors return { code: INTERNAL_ERROR, message: Internal server error. }', async () => {
    const res = await app.inject({ method: 'GET', url: '/throw-500' });
    assert.equal(res.statusCode, 500);
    const body = JSON.parse(res.payload);
    assert.equal(body.code, 'INTERNAL_ERROR');
    assert.equal(body.message, 'Internal server error.');
  });

  it('error response always has code and message keys', async () => {
    const res = await app.inject({ method: 'GET', url: '/throw-500' });
    assert.equal(res.statusCode, 500);
    const body = JSON.parse(res.payload);
    assert.ok('code' in body);
    assert.ok('message' in body);
    assert.equal(typeof body.code, 'string');
    assert.equal(typeof body.message, 'string');
    assert.ok(body.code.length > 0);
    assert.ok(body.message.length > 0);
  });
});
