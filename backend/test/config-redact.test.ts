import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for secret/credential redaction utilities.
 *
 * Covers config-redact.ts (YAML redaction) and journal.ts (log-line redaction)
 * to ensure no secrets leak through the /api/config or /api/logs endpoints.
 */

// ── config-redact.ts ──────────────────────────────────────────

import { redactConfigYaml } from '../src/services/config-redact';

describe('redactConfigYaml', { concurrency: 1 }, () => {
  it('redacts password values', () => {
    const input = 'api:\n  password: secret123\n  user: admin';
    const result = redactConfigYaml(input);
    assert.match(result, /\*\*\*REDACTED\*\*\*/);
    assert.doesNotMatch(result, /secret123/);
  });

  it('redacts token values', () => {
    const input = 'rtmp:\n  token: my-secret-token';
    const result = redactConfigYaml(input);
    assert.match(result, /\*\*\*REDACTED\*\*\*/);
    assert.doesNotMatch(result, /my-secret-token/);
  });

  it('preserves non-sensitive values unchanged', () => {
    const input = 'api:\n  port: 9997\n  user: admin';
    const result = redactConfigYaml(input);
    assert.equal(result, input);
  });

  it('redacts keys with mixed case (Password, SECRET)', () => {
    const input = 'auth:\n  Password: Cimic.12345\n  SECRET: supersecret';
    const result = redactConfigYaml(input);
    assert.match(result, /\*\*\*REDACTED\*\*\*/);
    assert.doesNotMatch(result, /Cimic\.12345/);
    assert.doesNotMatch(result, /supersecret/);
  });

  it('does not crash on empty lines', () => {
    const input = 'api:\n  password: \n  port: 9997';
    const result = redactConfigYaml(input);
    assert.doesNotThrow(() => { redactConfigYaml(input); });
    assert.ok(result.includes('password:'));
  });
});

// ── journal.ts redactCredentials ──────────────────────────────

import { redactCredentials } from '../src/services/journal';

describe('redactCredentials', { concurrency: 1 }, () => {
  it('redacts Authorization: Basic header value', () => {
    const input = 'GET /api/health Authorization: Basic dXNlcjpwYXNz';
    const result = redactCredentials(input);
    assert.match(result, /Authorization:\s*Basic\s+\*\*\*REDACTED\*\*\*/);
    assert.doesNotMatch(result, /dXNlcjpwYXNz/);
  });

  it('redacts Authorization: Bearer header value', () => {
    const input = 'GET /api/streams Authorization: Bearer eyJhbGciOiJIUzI1NiJ9';
    const result = redactCredentials(input);
    assert.match(result, /Authorization:\s*Bearer\s+\*\*\*REDACTED\*\*\*/);
    assert.doesNotMatch(result, /eyJhbGciOiJIUzI1NiJ9/);
  });

  it('redacts MEDIAMTX_API_PASSWORD= inline value', () => {
    const input = 'config: MEDIAMTX_API_PASSWORD=Cimic.12345';
    const result = redactCredentials(input);
    assert.match(result, /MEDIAMTX_API_PASSWORD=\*\*\*REDACTED\*\*\*/);
    assert.doesNotMatch(result, /Cimic\.12345/);
  });

  it('redacts password= inline value', () => {
    const input = 'args: --password=supersecret --user=admin';
    const result = redactCredentials(input);
    assert.match(result, /password=\*\*\*REDACTED\*\*\*/);
    assert.doesNotMatch(result, /supersecret/);
  });

  it('redacts token= inline value', () => {
    const input = 'args: --token=abc123def456';
    const result = redactCredentials(input);
    assert.match(result, /token=\*\*\*REDACTED\*\*\*/);
    assert.doesNotMatch(result, /abc123def456/);
  });

  it('redacts apiKey= inline value', () => {
    const input = 'apiKey=sk-abc123def456';
    const result = redactCredentials(input);
    assert.match(result, /apiKey=\*\*\*REDACTED\*\*\*/);
    assert.doesNotMatch(result, /sk-abc123def456/);
  });

  it('redacts secret= inline value', () => {
    const input = 'secret=s3cr3t!';
    const result = redactCredentials(input);
    assert.match(result, /secret=\*\*\*REDACTED\*\*\*/);
    assert.doesNotMatch(result, /s3cr3t!/);
  });

  it('handled multiple secrets on the same line', () => {
    const input = 'Authorization: Basic dXNlcjpwYXNz password=admin123';
    const result = redactCredentials(input);
    assert.match(result, /Authorization:\s*Basic\s+\*\*\*REDACTED\*\*\*/);
    assert.match(result, /password=\*\*\*REDACTED\*\*\*/);
    assert.doesNotMatch(result, /dXNlcjpwYXNz/);
    assert.doesNotMatch(result, /admin123/);
  });

  it('does not modify lines that are already clean', () => {
    const input = 'This is a normal log line without any secrets';
    const result = redactCredentials(input);
    assert.equal(result, input);
  });

  it('does not crash on empty string', () => {
    assert.doesNotThrow(() => redactCredentials(''));
    assert.equal(redactCredentials(''), '');
  });
});
