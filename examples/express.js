/**
 * EnvKit — Express Application Example
 *
 * Shows how to integrate EnvKit into an Express app startup.
 * This is a minimal example — not a production app.
 *
 * NOTE: This example does NOT actually import Express.
 * It demonstrates the startup pattern that EnvKit enables.
 */

import { loadEnv, validateEnv } from '../src/index.js';
import { EnvValidationError } from '../src/index.js';

/**
 * Load and validate environment variables at application startup.
 * This should be the FIRST thing your app does, before any other imports
 * that might depend on environment variables.
 *
 * @returns {object} Typed configuration object
 */
function bootstrap() {
  // 1. Load .env file — silently continue if not found (e.g. in production
  //    where env vars are injected by the platform)
  loadEnv({ silent: true });

  // 2. Validate and coerce
  const { values: config } = validateEnv({
    schema: {
      PORT: {
        type: 'number',
        default: 3000,
        min: 1,
        max: 65535,
      },
      HOST: {
        type: 'string',
        default: '0.0.0.0',
      },
      NODE_ENV: {
        type: 'string',
        default: 'development',
        choices: ['development', 'production', 'test'],
      },
      DATABASE_URL: {
        type: 'string',
        required: true,
      },
      JWT_SECRET: {
        type: 'string',
        required: true,
        min: 16, // enforce minimum secret length
      },
      API_URL: {
        type: 'url',
        required: false,
      },
      DEBUG: {
        type: 'boolean',
        default: false,
      },
    },
  });

  return config;
}

// ─── Application startup ───────────────────────────────────────────────────

let config;

try {
  config = bootstrap();
} catch (err) {
  if (err instanceof EnvValidationError) {
    // Print friendly error and exit — do not start a misconfigured app
    console.error(err.format());
    process.exit(1);
  }
  throw err;
}

// At this point, config is guaranteed to be valid.
console.log(`✓ EnvKit configuration loaded successfully`);
console.log(`  Starting server on ${config.HOST}:${config.PORT}`);
console.log(`  Environment: ${config.NODE_ENV}`);
console.log(`  Debug mode: ${config.DEBUG}`);

// In a real Express app, you would then:
//
//   const app = express();
//   app.listen(config.PORT, config.HOST, () => {
//     console.log(`Server running on http://${config.HOST}:${config.PORT}`);
//   });
