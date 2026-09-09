/**
 * EnvKit - Environment Variable Loader
 *
 * Loads .env files and populates process.env.
 * Does NOT overwrite existing environment variables by default.
 */

import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { parseEnvContent } from './parser.js';
import { EnvFileError } from './errors.js';

/**
 * @typedef {Object} LoadEnvOptions
 * @property {string | string[]} [path='.env'] - File path(s) to load. Later files take precedence when override=true.
 * @property {boolean} [override=false] - If true, loaded values overwrite existing process.env entries.
 * @property {boolean} [silent=false] - If true, missing files are silently ignored instead of throwing.
 */

/**
 * @typedef {Object} LoadEnvResult
 * @property {boolean} loaded - Whether at least one file was successfully loaded.
 * @property {string | string[]} path - The file path(s) that were attempted.
 * @property {string[]} variables - Names of the variables that were set (not values).
 * @property {string[]} files - Paths of files that were actually read.
 */

/**
 * Loads one or more .env files and populates process.env.
 *
 * Precedence rules:
 *   - When loading a single file, its values are applied if the key is absent from process.env
 *     (unless override: true).
 *   - When loading multiple files, they are applied left-to-right. Each file only sets variables
 *     not yet defined in process.env (or all variables when override: true). This means the
 *     FIRST file has lowest precedence; later files can add but not replace unless override is set.
 *   - Existing process.env values are NEVER overwritten unless override: true.
 *
 * @param {LoadEnvOptions} [options]
 * @returns {LoadEnvResult}
 */
export function loadEnv(options = {}) {
  const {
    path: filePaths = '.env',
    override = false,
    silent = false,
  } = options;

  const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
  const loadedFiles = [];
  const setVariables = new Set();

  for (const filePath of paths) {
    const absolutePath = path.resolve(process.cwd(), filePath);

    if (!existsSync(absolutePath)) {
      if (!silent) {
        throw new EnvFileError(
          `EnvKit: Could not find environment file: ${filePath}`,
          absolutePath,
        );
      }
      continue;
    }

    let content;
    try {
      content = readFileSync(absolutePath, 'utf8');
    } catch (err) {
      throw new EnvFileError(
        `EnvKit: Failed to read environment file: ${filePath} — ${err.message}`,
        absolutePath,
      );
    }

    const parsed = parseEnvContent(content);
    loadedFiles.push(filePath);

    for (const [key, value] of parsed) {
      const alreadySet = Object.prototype.hasOwnProperty.call(process.env, key);
      if (!alreadySet || override) {
        process.env[key] = value;
        setVariables.add(key);
      }
    }
  }

  return {
    loaded: loadedFiles.length > 0,
    path: Array.isArray(filePaths) ? filePaths : filePaths,
    variables: Array.from(setVariables),
    files: loadedFiles,
  };
}
