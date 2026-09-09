/**
 * CLI tests (src/cli.js)
 *
 * Tests the CLI argument parsing and output without spawning a child process
 * for unit-level coverage. Integration-level exit code tests use child_process.
 */

import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CLI = path.join(ROOT, 'bin', 'envkit.js');
const TMP_DIR = path.join(__dirname, '__tmp_cli__');

/**
 * Runs the CLI with the given arguments in TMP_DIR as cwd.
 * Returns { code, stdout, stderr }.
 */
function runCli(args = [], cwd = ROOT) {
  return new Promise((resolve) => {
    const proc = spawn(process.execPath, [CLI, ...args], {
      cwd,
      env: { ...process.env, NO_COLOR: '1' },
    });

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

describe('CLI', () => {
  afterEach(() => {
    rmSync(TMP_DIR, { recursive: true, force: true });
  });

  it('--help prints usage and exits 0', async () => {
    const { code, stdout } = await runCli(['--help']);
    assert.equal(code, 0);
    assert.ok(stdout.includes('EnvKit'));
    assert.ok(stdout.includes('check'));
    assert.ok(stdout.includes('--env'));
  });

  it('-h prints usage and exits 0', async () => {
    const { code, stdout } = await runCli(['-h']);
    assert.equal(code, 0);
    assert.ok(stdout.includes('EnvKit'));
  });

  it('no args prints help and exits 0', async () => {
    const { code, stdout } = await runCli([]);
    assert.equal(code, 0);
    assert.ok(stdout.includes('EnvKit'));
  });

  it('--version prints version and exits 0', async () => {
    const { code, stdout } = await runCli(['--version']);
    assert.equal(code, 0);
    assert.ok(stdout.includes('envkit'));
    assert.match(stdout, /\d+\.\d+\.\d+/);
  });

  it('-v prints version and exits 0', async () => {
    const { code, stdout } = await runCli(['-v']);
    assert.equal(code, 0);
    assert.match(stdout, /\d+\.\d+\.\d+/);
  });

  it('unknown command exits 1', async () => {
    const { code, stderr } = await runCli(['unknowncmd']);
    assert.equal(code, 1);
    assert.ok(stderr.includes('Unknown command'));
  });

  it('check with no config and no .env exits 0 (no schema)', async () => {
    // Create an empty temp dir with no .env and no config
    mkdirSync(TMP_DIR, { recursive: true });
    const { code, stdout: _stdout } = await runCli(['check', '--env', '__nonexistent__.env'], TMP_DIR);
    // Should warn about missing file but still exit 0 (no schema to validate)
    assert.equal(code, 0);
  });

  it('check with valid schema and env exits 0', async () => {
    mkdirSync(TMP_DIR, { recursive: true });
    writeFileSync(path.join(TMP_DIR, '.env'), 'PORT=3000\n');
    writeFileSync(
      path.join(TMP_DIR, 'envkit.config.js'),
      `export default { schema: { PORT: { type: 'number', required: true } } };\n`,
    );
    const { code, stdout } = await runCli(['check'], TMP_DIR);
    assert.equal(code, 0, `Expected exit 0. stdout: ${stdout}`);
    assert.ok(stdout.includes('✓'));
  });

  it('check with invalid schema exits 1', async () => {
    mkdirSync(TMP_DIR, { recursive: true });
    writeFileSync(path.join(TMP_DIR, '.env'), '');
    writeFileSync(
      path.join(TMP_DIR, 'envkit.config.js'),
      `export default { schema: { MISSING_VAR: { type: 'string', required: true } } };\n`,
    );
    const { code, stdout } = await runCli(['check'], TMP_DIR);
    assert.equal(code, 1, `Expected exit 1. stdout: ${stdout}`);
    assert.ok(stdout.includes('✗'));
  });

  it('check output does not contain secret values', async () => {
    mkdirSync(TMP_DIR, { recursive: true });
    writeFileSync(path.join(TMP_DIR, '.env'), 'JWT_SECRET=super-secret-value\n');
    writeFileSync(
      path.join(TMP_DIR, 'envkit.config.js'),
      `export default { schema: { JWT_SECRET: { type: 'string', required: true } } };\n`,
    );
    const { code: _code, stdout, stderr } = await runCli(['check'], TMP_DIR);
    assert.ok(
      !stdout.includes('super-secret-value') && !stderr.includes('super-secret-value'),
      'CLI must not print secret values',
    );
  });

  it('check --env loads a custom .env file', async () => {
    mkdirSync(TMP_DIR, { recursive: true });
    writeFileSync(path.join(TMP_DIR, '.env.custom'), 'PORT=4000\n');
    writeFileSync(
      path.join(TMP_DIR, 'envkit.config.js'),
      `export default { schema: { PORT: { type: 'number', required: true } } };\n`,
    );
    const { code } = await runCli(['check', '--env', '.env.custom'], TMP_DIR);
    assert.equal(code, 0);
  });
});
