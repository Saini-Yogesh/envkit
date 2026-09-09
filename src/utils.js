/**
 * EnvKit - Internal Utilities
 */

import { fileURLToPath } from 'url';
import path from 'path';
import { readFileSync } from 'fs';

/**
 * Resolves the package version from package.json.
 * @returns {string}
 */
export function getPackageVersion() {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const pkgPath = path.resolve(__dirname, '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/**
 * Redacts a string value to protect secrets.
 * @param {string} value
 * @returns {string}
 */
export function redact(value) {
  if (!value || value.length === 0) { return '[empty]'; }
  return '[REDACTED]';
}

/**
 * Returns true if the value is a non-empty string.
 * @param {unknown} val
 * @returns {boolean}
 */
export function isNonEmptyString(val) {
  return typeof val === 'string' && val.length > 0;
}

/**
 * Checks whether a string looks like a valid URL.
 * @param {string} val
 * @returns {boolean}
 */
export function isValidUrl(val) {
  try {
    const u = new URL(val);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Attempts to parse a string as JSON.
 * @param {string} val
 * @returns {{ ok: boolean, value: unknown }}
 */
export function tryParseJson(val) {
  try {
    return { ok: true, value: JSON.parse(val) };
  } catch {
    return { ok: false, value: undefined };
  }
}

/**
 * Coerces a string environment variable value to a boolean.
 * Accepts: 'true', '1', 'yes', 'on' → true
 *          'false', '0', 'no', 'off' → false
 *
 * @param {string} val
 * @returns {{ ok: boolean, value: boolean }}
 */
export function parseBoolean(val) {
  const lower = val.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(lower)) { return { ok: true, value: true }; }
  if (['false', '0', 'no', 'off'].includes(lower)) { return { ok: true, value: false }; }
  return { ok: false, value: false };
}

/**
 * Coerces a string environment variable value to a number.
 * @param {string} val
 * @returns {{ ok: boolean, value: number }}
 */
export function parseNumber(val) {
  const n = Number(val.trim());
  if (!isNaN(n) && val.trim() !== '') { return { ok: true, value: n }; }
  return { ok: false, value: 0 };
}
