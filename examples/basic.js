/**
 * EnvKit — Basic Usage Example
 *
 * Demonstrates loading a .env file and accessing variables.
 * Run from the package root: node examples/basic.js
 */

import { loadEnv, env } from '../src/index.js';

// Load .env from the current directory.
// By default, this will throw if the file doesn't exist.
// Use { silent: true } to suppress missing-file errors.
const result = loadEnv({ path: '.env.example', silent: true });

console.log('Load result:');
console.log({
  loaded: result.loaded,
  files: result.files,
  variableCount: result.variables.length,
  // variables: result.variables — keys only, no values
});

// Access variables through the env proxy (reads from process.env)
console.log('\nAccessing variables:');
console.log('NODE_ENV:', env.NODE_ENV);
console.log('PORT:', env.PORT);

// Or directly from process.env
console.log('DATABASE_URL set:', !!process.env.DATABASE_URL);
