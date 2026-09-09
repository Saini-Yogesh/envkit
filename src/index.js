/**
 * EnvKit - Public API Entry Point
 *
 * Exports the complete public surface of the envkit package.
 */

export { loadEnv } from './loader.js';
export { validateEnv } from './validator.js';
export { EnvKitError, EnvFileError, EnvValidationError } from './errors.js';

/**
 * A safe proxy to process.env.
 *
 * Usage:
 *   import { env } from 'envkit';
 *   console.log(env.PORT);        // same as process.env.PORT
 *   console.log(env.DATABASE_URL);
 *
 * The proxy reads directly from process.env at access time, so it always
 * reflects the current state (including variables loaded after import).
 * No values are duplicated or cached.
 *
 * @type {NodeJS.ProcessEnv}
 */
export const env = new Proxy(
  {},
  {
    get(_target, prop) {
      if (typeof prop === 'symbol') { return undefined; }
      return process.env[prop];
    },
    set(_target, prop, value) {
      if (typeof prop === 'symbol') { return false; }
      process.env[prop] = String(value);
      return true;
    },
    has(_target, prop) {
      return prop in process.env;
    },
    ownKeys() {
      return Object.keys(process.env);
    },
    getOwnPropertyDescriptor(_target, prop) {
      if (prop in process.env) {
        return { configurable: true, enumerable: true, writable: true, value: process.env[prop] };
      }
      return undefined;
    },
  },
);
