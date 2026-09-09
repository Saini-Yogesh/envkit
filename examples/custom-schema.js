/**
 * EnvKit — Custom Schema Example
 *
 * Demonstrates a realistic production-style schema with all constraint types.
 * Run from the package root: node examples/custom-schema.js
 */

import { loadEnv, validateEnv } from '../src/index.js';
import { EnvValidationError } from '../src/index.js';

loadEnv({ path: '.env.example', silent: true });

/**
 * A production-style schema covering all EnvKit features.
 */
const schema = {
  // ─── Server ──────────────────────────────────────────────────
  PORT: {
    type: 'number',
    required: true,
    min: 1,
    max: 65535,
  },
  HOST: {
    type: 'string',
    default: '0.0.0.0',
  },
  NODE_ENV: {
    type: 'string',
    required: true,
    choices: ['development', 'staging', 'production', 'test'],
  },

  // ─── Database ─────────────────────────────────────────────────
  DATABASE_URL: {
    type: 'string',
    required: true,
    // Custom validator: ensure it's a recognized DB protocol
    validate: (v) =>
      v.startsWith('mongodb://') ||
      v.startsWith('mongodb+srv://') ||
      v.startsWith('postgres://') ||
      v.startsWith('postgresql://') ||
      'DATABASE_URL must be a MongoDB or PostgreSQL connection string',
  },

  // ─── Auth ──────────────────────────────────────────────────────
  JWT_SECRET: {
    type: 'string',
    required: true,
    min: 32, // minimum secret length for security
  },
  API_KEY: {
    type: 'string',
    required: true,
    pattern: /^[A-Za-z0-9_-]{16,}$/, // alphanumeric, min 16 chars
  },

  // ─── External services ─────────────────────────────────────────
  API_URL: {
    type: 'url',
    required: false,
  },

  // ─── Feature flags ─────────────────────────────────────────────
  DEBUG: {
    type: 'boolean',
    default: false,
  },
  ENABLE_CACHE: {
    type: 'boolean',
    default: true,
  },

  // ─── JSON config ───────────────────────────────────────────────
  // Example: RATE_LIMIT={"max":100,"windowMs":60000}
  RATE_LIMIT: {
    type: 'json',
    required: false,
  },
};

try {
  const config = validateEnv({ schema });

  console.log('✓ All environment variables validated successfully!\n');
  console.log('Configuration summary (no secret values shown):');
  console.log('  PORT:', config.values.PORT);
  console.log('  HOST:', config.values.HOST);
  console.log('  NODE_ENV:', config.values.NODE_ENV);
  console.log('  DATABASE_URL set:', !!config.values.DATABASE_URL);
  console.log('  JWT_SECRET set:', !!config.values.JWT_SECRET);
  console.log('  API_KEY set:', !!config.values.API_KEY);
  console.log('  DEBUG:', config.values.DEBUG);
  console.log('  ENABLE_CACHE:', config.values.ENABLE_CACHE);
  if (config.values.RATE_LIMIT) {
    console.log('  RATE_LIMIT:', JSON.stringify(config.values.RATE_LIMIT));
  }

} catch (err) {
  if (err instanceof EnvValidationError) {
    console.error('\n' + err.format());
    process.exit(1);
  }
  throw err;
}
