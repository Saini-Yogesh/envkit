/**
 * Tests for the .env loader (src/loader.js)
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnv } from '../src/loader.js';
import { EnvFileError } from '../src/errors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TMP_DIR = path.join(__dirname, '__tmp_loader__');

/**
 * Helper: write a temp .env file and return its path.
 */
function writeTempEnv(filename, content) {
  const filePath = path.join(TMP_DIR, filename);
  writeFileSync(filePath, content, 'utf8');
  return filePath;
}

/**
 * Helper: delete a key from process.env.
 */
function deleteEnvKey(...keys) {
  for (const key of keys) {
    delete process.env[key];
  }
}

describe('loadEnv', () => {
  beforeEach(() => {
    mkdirSync(TMP_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TMP_DIR, { recursive: true, force: true });
    // Clean up any env vars set during tests
    deleteEnvKey(
      'TEST_PORT', 'TEST_HOST', 'TEST_KEY', 'TEST_EMPTY',
      'TEST_QUOTED', 'TEST_DB', 'TEST_OVERRIDE', 'TEST_DUP',
      'TEST_MULTIFILE_A', 'TEST_MULTIFILE_B',
    );
  });

  it('loads a .env file and sets process.env', () => {
    const filePath = writeTempEnv('.env.test1', 'TEST_PORT=9999\nTEST_HOST=myhost');
    loadEnv({ path: filePath });
    assert.equal(process.env.TEST_PORT, '9999');
    assert.equal(process.env.TEST_HOST, 'myhost');
  });

  it('returns structured result with loaded=true and variable names', () => {
    const filePath = writeTempEnv('.env.test2', 'TEST_KEY=hello');
    const result = loadEnv({ path: filePath });
    assert.equal(result.loaded, true);
    assert.ok(result.variables.includes('TEST_KEY'));
  });

  it('does NOT include variable values in the result', () => {
    const filePath = writeTempEnv('.env.test3', 'TEST_KEY=supersecret');
    const result = loadEnv({ path: filePath });
    assert.ok(!JSON.stringify(result).includes('supersecret'));
  });

  it('handles empty values', () => {
    const filePath = writeTempEnv('.env.test4', 'TEST_EMPTY=');
    loadEnv({ path: filePath });
    assert.equal(process.env.TEST_EMPTY, '');
  });

  it('handles quoted values', () => {
    const filePath = writeTempEnv('.env.test5', 'TEST_QUOTED="hello world"');
    loadEnv({ path: filePath });
    assert.equal(process.env.TEST_QUOTED, 'hello world');
  });

  it('does NOT overwrite existing process.env values by default', () => {
    process.env.TEST_OVERRIDE = 'original';
    const filePath = writeTempEnv('.env.test6', 'TEST_OVERRIDE=new_value');
    loadEnv({ path: filePath });
    assert.equal(process.env.TEST_OVERRIDE, 'original');
  });

  it('overwrites existing process.env values when override: true', () => {
    process.env.TEST_OVERRIDE = 'original';
    const filePath = writeTempEnv('.env.test7', 'TEST_OVERRIDE=overwritten');
    loadEnv({ path: filePath, override: true });
    assert.equal(process.env.TEST_OVERRIDE, 'overwritten');
  });

  it('throws EnvFileError for missing file', () => {
    assert.throws(
      () => loadEnv({ path: '/nonexistent/path/.env' }),
      (err) => err instanceof EnvFileError,
    );
  });

  it('silently ignores missing file when silent: true', () => {
    assert.doesNotThrow(() => {
      const result = loadEnv({ path: '/nonexistent/.env', silent: true });
      assert.equal(result.loaded, false);
    });
  });

  it('loads multiple files in order', () => {
    const file1 = writeTempEnv('.env.multi1', 'TEST_MULTIFILE_A=from_file1\nTEST_MULTIFILE_B=from_file1');
    const file2 = writeTempEnv('.env.multi2', 'TEST_MULTIFILE_B=from_file2');
    // file2 should NOT overwrite file1 values (no override)
    loadEnv({ path: [file1, file2] });
    assert.equal(process.env.TEST_MULTIFILE_A, 'from_file1');
    assert.equal(process.env.TEST_MULTIFILE_B, 'from_file1'); // first file wins
  });

  it('loads multiple files with override: true (last file wins)', () => {
    const file1 = writeTempEnv('.env.multi3', 'TEST_MULTIFILE_A=from_file1\nTEST_MULTIFILE_B=from_file1');
    const file2 = writeTempEnv('.env.multi4', 'TEST_MULTIFILE_B=from_file2');
    loadEnv({ path: [file1, file2], override: true });
    assert.equal(process.env.TEST_MULTIFILE_A, 'from_file1');
    assert.equal(process.env.TEST_MULTIFILE_B, 'from_file2'); // last wins
  });

  it('returns files array with paths that were actually read', () => {
    const file1 = writeTempEnv('.env.files1', 'TEST_DB=mongo');
    const result = loadEnv({ path: file1 });
    assert.ok(result.files.includes(file1));
  });

  it('handles duplicate keys in file — last one wins', () => {
    const filePath = writeTempEnv('.env.dup', 'TEST_DUP=first\nTEST_DUP=second');
    loadEnv({ path: filePath });
    assert.equal(process.env.TEST_DUP, 'second');
  });
});
