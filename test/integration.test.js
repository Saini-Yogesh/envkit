/**
 * Integration test — simulates a realistic Node.js application startup.
 *
 * Verifies that loadEnv + validateEnv work correctly end-to-end,
 * mimicking how a real backend app would use envkit.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnv } from '../src/loader.js';
import { validateEnv } from '../src/validator.js';
import { env } from '../src/index.js';
import { EnvValidationError } from '../src/errors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TMP_DIR = path.join(__dirname, '__tmp_integration__');

function cleanup() {
  rmSync(TMP_DIR, { recursive: true, force: true });
  // Remove any test env vars
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('INTTEST_')) { delete process.env[key]; }
  }
}

describe('Integration: application startup', () => {
  beforeEach(() => {
    cleanup();
    mkdirSync(TMP_DIR, { recursive: true });
  });

  afterEach(() => {
    cleanup();
  });

  it('simulates full app startup with .env loading and schema validation', () => {
    const envFile = path.join(TMP_DIR, '.env');
    writeFileSync(envFile, [
      'INTTEST_PORT=3000',
      'INTTEST_DB=mongodb://localhost:27017/app',
      'INTTEST_JWT=changeme',
      'INTTEST_DEBUG=true',
    ].join('\n'));

    // Step 1: load .env
    const loadResult = loadEnv({ path: envFile });
    assert.equal(loadResult.loaded, true);
    assert.ok(loadResult.variables.includes('INTTEST_PORT'));

    // Step 2: validate
    const config = validateEnv({
      schema: {
        INTTEST_PORT:  { type: 'number', required: true, min: 1, max: 65535 },
        INTTEST_DB:    { type: 'string', required: true },
        INTTEST_JWT:   { type: 'string', required: true },
        INTTEST_DEBUG: { type: 'boolean', default: false },
      },
    });

    assert.equal(config.valid, true);
    assert.equal(config.values.INTTEST_PORT, 3000);
    assert.equal(typeof config.values.INTTEST_PORT, 'number');
    assert.equal(config.values.INTTEST_DEBUG, true);
    assert.equal(typeof config.values.INTTEST_DEBUG, 'boolean');
    assert.equal(config.values.INTTEST_DB, 'mongodb://localhost:27017/app');
  });

  it('env proxy correctly reflects loaded variables', () => {
    const envFile = path.join(TMP_DIR, '.env.proxy');
    writeFileSync(envFile, 'INTTEST_PROXY_VAR=proxy_value');

    loadEnv({ path: envFile });

    assert.equal(env.INTTEST_PROXY_VAR, 'proxy_value');
    assert.equal(env.INTTEST_PROXY_VAR, process.env.INTTEST_PROXY_VAR);
  });

  it('throws EnvValidationError with structured errors on startup failure', () => {
    const envFile = path.join(TMP_DIR, '.env.fail');
    writeFileSync(envFile, 'INTTEST_PORT=not-a-number\n');

    loadEnv({ path: envFile });

    let caught;
    try {
      validateEnv({
        schema: {
          INTTEST_PORT:      { type: 'number', required: true },
          INTTEST_MISSING_X: { type: 'string', required: true },
        },
      });
    } catch (err) {
      caught = err;
    }

    assert.ok(caught instanceof EnvValidationError, 'Should throw EnvValidationError');
    assert.ok(Array.isArray(caught.errors));
    assert.ok(caught.errors.length >= 2); // type error + missing

    // format() should work
    const formatted = caught.format();
    assert.ok(formatted.includes('✗'));
    assert.ok(!formatted.includes('not-a-number')); // no secret values
  });

  it('production schema example works with defaults', () => {
    const envFile = path.join(TMP_DIR, '.env.prod');
    writeFileSync(envFile, [
      'INTTEST_PORT=8080',
      'INTTEST_DB=postgres://user:pass@localhost/db',
    ].join('\n'));

    loadEnv({ path: envFile });

    const config = validateEnv({
      schema: {
        INTTEST_PORT:    { type: 'number', required: true, min: 1, max: 65535 },
        INTTEST_DB:      { type: 'string', required: true },
        INTTEST_LOG_LVL: { type: 'string', default: 'info', choices: ['debug', 'info', 'warn', 'error'] },
        INTTEST_DEBUG:   { type: 'boolean', default: false },
      },
    });

    assert.equal(config.valid, true);
    assert.equal(config.values.INTTEST_PORT, 8080);
    assert.equal(config.values.INTTEST_LOG_LVL, 'info'); // default
    assert.equal(config.values.INTTEST_DEBUG, false);    // default
    // Defaults must NOT be injected into process.env
    assert.equal(process.env.INTTEST_LOG_LVL, undefined);
    assert.equal(process.env.INTTEST_DEBUG, undefined);
  });
});
