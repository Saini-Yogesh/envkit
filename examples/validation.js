/**
 * EnvKit — Schema Validation Example
 *
 * Demonstrates type coercion, constraints, defaults, and error handling.
 * Run from the package root: node examples/validation.js
 */

import { loadEnv, validateEnv } from '../src/index.js';
import { EnvValidationError } from '../src/index.js';

// Load the example env file
loadEnv({ path: '.env.example', silent: true });

try {
  const config = validateEnv({
    schema: {
      PORT: {
        type: 'number',
        required: true,
        min: 1,
        max: 65535,
      },
      NODE_ENV: {
        type: 'string',
        required: true,
        choices: ['development', 'production', 'test'],
      },
      DATABASE_URL: {
        type: 'string',
        required: true,
      },
      DEBUG: {
        type: 'boolean',
        default: false,
      },
    },
  });

  console.log('✓ Validation passed!');
  console.log('\nTyped config values:');
  console.log('  PORT:', config.values.PORT, `(${typeof config.values.PORT})`);
  console.log('  NODE_ENV:', config.values.NODE_ENV);
  console.log('  DEBUG:', config.values.DEBUG, `(${typeof config.values.DEBUG})`);
  console.log('  DATABASE_URL set:', !!config.values.DATABASE_URL);

} catch (err) {
  if (err instanceof EnvValidationError) {
    console.error(err.format());
    process.exit(1);
  }
  throw err;
}
