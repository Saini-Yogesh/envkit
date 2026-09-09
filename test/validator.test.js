/**
 * Tests for the environment validator (src/validator.js)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateEnv } from '../src/validator.js';
import { EnvValidationError } from '../src/errors.js';

/**
 * Helper: sets process.env keys, returns a cleanup function.
 */
function withEnv(vars) {
  const originals = {};
  for (const [k, v] of Object.entries(vars)) {
    originals[k] = process.env[k];
    if (v === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  }
  return () => {
    for (const [k, v] of Object.entries(originals)) {
      if (v === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = v;
      }
    }
  };
}

describe('validateEnv', () => {
  describe('required list', () => {
    it('passes when all required variables are present', () => {
      const cleanup = withEnv({ TEST_VREQ_A: 'hello', TEST_VREQ_B: 'world' });
      try {
        const result = validateEnv({ required: ['TEST_VREQ_A', 'TEST_VREQ_B'] });
        assert.equal(result.valid, true);
        assert.equal(result.errors.length, 0);
      } finally { cleanup(); }
    });

    it('fails when required variables are missing', () => {
      const cleanup = withEnv({ TEST_MISSING_X: undefined });
      try {
        const result = validateEnv({ required: ['TEST_MISSING_X'], throw: false });
        assert.equal(result.valid, false);
        assert.equal(result.errors.length, 1);
        assert.equal(result.errors[0].key, 'TEST_MISSING_X');
        assert.equal(result.errors[0].code, 'MISSING_VARIABLE');
      } finally { cleanup(); }
    });

    it('throws EnvValidationError by default on failure', () => {
      const cleanup = withEnv({ TEST_THROW_VAR: undefined });
      try {
        assert.throws(
          () => validateEnv({ required: ['TEST_THROW_VAR'] }),
          (err) => err instanceof EnvValidationError,
        );
      } finally { cleanup(); }
    });

    it('collects multiple missing variables', () => {
      const cleanup = withEnv({ TEST_MULTI_A: undefined, TEST_MULTI_B: undefined });
      try {
        const result = validateEnv({ required: ['TEST_MULTI_A', 'TEST_MULTI_B'], throw: false });
        assert.equal(result.errors.length, 2);
      } finally { cleanup(); }
    });
  });

  describe('string type', () => {
    it('validates a string value', () => {
      const cleanup = withEnv({ STR_VAR: 'hello' });
      try {
        const result = validateEnv({ schema: { STR_VAR: { type: 'string', required: true } } });
        assert.equal(result.valid, true);
        assert.equal(result.values.STR_VAR, 'hello');
      } finally { cleanup(); }
    });

    it('validates choices constraint', () => {
      const cleanup = withEnv({ NODE_ENV_T: 'development' });
      try {
        const result = validateEnv({
          schema: { NODE_ENV_T: { type: 'string', choices: ['development', 'production'] } },
        });
        assert.equal(result.valid, true);
      } finally { cleanup(); }
    });

    it('fails on invalid choice', () => {
      const cleanup = withEnv({ NODE_ENV_T: 'staging' });
      try {
        const result = validateEnv({
          schema: { NODE_ENV_T: { type: 'string', choices: ['development', 'production'] } },
          throw: false,
        });
        assert.equal(result.valid, false);
        assert.equal(result.errors[0].code, 'INVALID_CHOICE');
      } finally { cleanup(); }
    });

    it('validates min length constraint', () => {
      const cleanup = withEnv({ SHORT_STR: 'ab' });
      try {
        const result = validateEnv({
          schema: { SHORT_STR: { type: 'string', min: 5 } },
          throw: false,
        });
        assert.equal(result.valid, false);
        assert.equal(result.errors[0].code, 'OUT_OF_RANGE');
      } finally { cleanup(); }
    });

    it('validates max length constraint', () => {
      const cleanup = withEnv({ LONG_STR: 'averylongvalue' });
      try {
        const result = validateEnv({
          schema: { LONG_STR: { type: 'string', max: 5 } },
          throw: false,
        });
        assert.equal(result.valid, false);
        assert.equal(result.errors[0].code, 'OUT_OF_RANGE');
      } finally { cleanup(); }
    });

    it('validates pattern constraint', () => {
      const cleanup = withEnv({ PATTERN_VAR: 'hello123' });
      try {
        const result = validateEnv({
          schema: { PATTERN_VAR: { type: 'string', pattern: /^\d+$/ } },
          throw: false,
        });
        assert.equal(result.valid, false);
        assert.equal(result.errors[0].code, 'PATTERN_MISMATCH');
      } finally { cleanup(); }
    });
  });

  describe('number type', () => {
    it('coerces a numeric string to a number', () => {
      const cleanup = withEnv({ NUM_VAR: '3000' });
      try {
        const result = validateEnv({ schema: { NUM_VAR: { type: 'number', required: true } } });
        assert.equal(result.values.NUM_VAR, 3000);
        assert.equal(typeof result.values.NUM_VAR, 'number');
      } finally { cleanup(); }
    });

    it('fails for non-numeric strings', () => {
      const cleanup = withEnv({ NUM_VAR: 'hello' });
      try {
        const result = validateEnv({ schema: { NUM_VAR: { type: 'number' } }, throw: false });
        assert.equal(result.valid, false);
        assert.equal(result.errors[0].code, 'INVALID_TYPE');
      } finally { cleanup(); }
    });

    it('validates min constraint', () => {
      const cleanup = withEnv({ PORT_VAR: '0' });
      try {
        const result = validateEnv({
          schema: { PORT_VAR: { type: 'number', min: 1 } },
          throw: false,
        });
        assert.equal(result.valid, false);
        assert.equal(result.errors[0].code, 'OUT_OF_RANGE');
      } finally { cleanup(); }
    });

    it('validates max constraint', () => {
      const cleanup = withEnv({ PORT_VAR: '99999' });
      try {
        const result = validateEnv({
          schema: { PORT_VAR: { type: 'number', max: 65535 } },
          throw: false,
        });
        assert.equal(result.valid, false);
        assert.equal(result.errors[0].code, 'OUT_OF_RANGE');
      } finally { cleanup(); }
    });
  });

  describe('boolean type', () => {
    it('coerces "true" to boolean true', () => {
      const cleanup = withEnv({ BOOL_VAR: 'true' });
      try {
        const result = validateEnv({ schema: { BOOL_VAR: { type: 'boolean' } } });
        assert.equal(result.values.BOOL_VAR, true);
        assert.equal(typeof result.values.BOOL_VAR, 'boolean');
      } finally { cleanup(); }
    });

    it('coerces "false" to boolean false', () => {
      const cleanup = withEnv({ BOOL_VAR: 'false' });
      try {
        const result = validateEnv({ schema: { BOOL_VAR: { type: 'boolean' } } });
        assert.equal(result.values.BOOL_VAR, false);
      } finally { cleanup(); }
    });

    it('coerces "1" to boolean true', () => {
      const cleanup = withEnv({ BOOL_VAR: '1' });
      try {
        const result = validateEnv({ schema: { BOOL_VAR: { type: 'boolean' } } });
        assert.equal(result.values.BOOL_VAR, true);
      } finally { cleanup(); }
    });

    it('coerces "0" to boolean false', () => {
      const cleanup = withEnv({ BOOL_VAR: '0' });
      try {
        const result = validateEnv({ schema: { BOOL_VAR: { type: 'boolean' } } });
        assert.equal(result.values.BOOL_VAR, false);
      } finally { cleanup(); }
    });

    it('fails for invalid boolean strings', () => {
      const cleanup = withEnv({ BOOL_VAR: 'maybe' });
      try {
        const result = validateEnv({ schema: { BOOL_VAR: { type: 'boolean' } }, throw: false });
        assert.equal(result.valid, false);
        assert.equal(result.errors[0].code, 'INVALID_TYPE');
      } finally { cleanup(); }
    });
  });

  describe('url type', () => {
    it('accepts a valid HTTPS URL', () => {
      const cleanup = withEnv({ API_URL: 'https://api.example.com' });
      try {
        const result = validateEnv({ schema: { API_URL: { type: 'url', required: true } } });
        assert.equal(result.valid, true);
        assert.equal(result.values.API_URL, 'https://api.example.com');
      } finally { cleanup(); }
    });

    it('accepts a valid HTTP URL', () => {
      const cleanup = withEnv({ API_URL: 'http://localhost:3000' });
      try {
        const result = validateEnv({ schema: { API_URL: { type: 'url' } } });
        assert.equal(result.valid, true);
      } finally { cleanup(); }
    });

    it('rejects an invalid URL', () => {
      const cleanup = withEnv({ API_URL: 'not-a-url' });
      try {
        const result = validateEnv({ schema: { API_URL: { type: 'url' } }, throw: false });
        assert.equal(result.valid, false);
        assert.equal(result.errors[0].code, 'INVALID_TYPE');
      } finally { cleanup(); }
    });
  });

  describe('json type', () => {
    it('parses valid JSON', () => {
      const cleanup = withEnv({ JSON_VAR: '{"key":"value"}' });
      try {
        const result = validateEnv({ schema: { JSON_VAR: { type: 'json' } } });
        assert.equal(result.valid, true);
        assert.deepEqual(result.values.JSON_VAR, { key: 'value' });
      } finally { cleanup(); }
    });

    it('fails on invalid JSON', () => {
      const cleanup = withEnv({ JSON_VAR: '{invalid}' });
      try {
        const result = validateEnv({ schema: { JSON_VAR: { type: 'json' } }, throw: false });
        assert.equal(result.valid, false);
        assert.equal(result.errors[0].code, 'INVALID_TYPE');
      } finally { cleanup(); }
    });
  });

  describe('defaults', () => {
    it('uses default when variable is absent', () => {
      const cleanup = withEnv({ DEFAULT_PORT: undefined });
      try {
        const result = validateEnv({
          schema: { DEFAULT_PORT: { type: 'number', default: 3000 } },
        });
        assert.equal(result.values.DEFAULT_PORT, 3000);
      } finally { cleanup(); }
    });

    it('uses default for string type', () => {
      const cleanup = withEnv({ DEFAULT_HOST: undefined });
      try {
        const result = validateEnv({
          schema: { DEFAULT_HOST: { type: 'string', default: 'localhost' } },
        });
        assert.equal(result.values.DEFAULT_HOST, 'localhost');
      } finally { cleanup(); }
    });

    it('does not use default when variable IS present', () => {
      const cleanup = withEnv({ DEFAULT_PORT: '8080' });
      try {
        const result = validateEnv({
          schema: { DEFAULT_PORT: { type: 'number', default: 3000 } },
        });
        assert.equal(result.values.DEFAULT_PORT, 8080);
      } finally { cleanup(); }
    });

    it('does NOT mutate process.env with default values', () => {
      delete process.env.NO_MUTATE_VAR;
      const result = validateEnv({
        schema: { NO_MUTATE_VAR: { type: 'string', default: 'injected' } },
      });
      assert.equal(result.values.NO_MUTATE_VAR, 'injected');
      assert.equal(process.env.NO_MUTATE_VAR, undefined);
    });
  });

  describe('optional variables', () => {
    it('does not error on absent optional variables', () => {
      const cleanup = withEnv({ OPT_VAR: undefined });
      try {
        const result = validateEnv({ schema: { OPT_VAR: { type: 'string', required: false } } });
        assert.equal(result.valid, true);
        assert.ok(!('OPT_VAR' in result.values));
      } finally { cleanup(); }
    });
  });

  describe('custom validator', () => {
    it('passes when custom validator returns true', () => {
      const cleanup = withEnv({ CUSTOM_VAR: 'valid-value' });
      try {
        const result = validateEnv({
          schema: {
            CUSTOM_VAR: {
              type: 'string',
              validate: (v) => v.startsWith('valid') || 'Must start with "valid"',
            },
          },
        });
        assert.equal(result.valid, true);
      } finally { cleanup(); }
    });

    it('fails when custom validator returns a message', () => {
      const cleanup = withEnv({ CUSTOM_VAR: 'bad-value' });
      try {
        const result = validateEnv({
          schema: {
            CUSTOM_VAR: {
              type: 'string',
              validate: (v) => v.startsWith('valid') || 'Must start with "valid"',
            },
          },
          throw: false,
        });
        assert.equal(result.valid, false);
        assert.equal(result.errors[0].code, 'CUSTOM_VALIDATION_FAILED');
      } finally { cleanup(); }
    });
  });

  describe('security', () => {
    it('does not include secret values in error messages', () => {
      const cleanup = withEnv({ JWT_SECRET_TEST: 'super-secret-value' });
      try {
        const result = validateEnv({
          schema: { JWT_SECRET_TEST: { type: 'number' } },
          throw: false,
        });
        for (const err of result.errors) {
          assert.ok(
            !err.message.includes('super-secret-value'),
            'Error message must not contain the actual secret value',
          );
        }
      } finally { cleanup(); }
    });

    it('does not include secret values in thrown error', () => {
      const cleanup = withEnv({ SECRET_KEY_TEST: undefined });
      try {
        let thrownErr;
        try {
          validateEnv({ required: ['SECRET_KEY_TEST'] });
        } catch (err) {
          thrownErr = err;
        }
        assert.ok(thrownErr instanceof EnvValidationError);
        // The error message should mention the key name but not any value
        assert.ok(thrownErr.message.includes('SECRET_KEY_TEST'));
      } finally { cleanup(); }
    });
  });
});
