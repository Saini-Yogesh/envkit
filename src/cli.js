/**
 * EnvKit - CLI implementation
 *
 * Provides `envkit check` and related commands for validating
 * environment configuration from the terminal and CI environments.
 */

import { existsSync } from 'fs';
import path from 'path';
import { loadEnv } from './loader.js';
import { validateEnv } from './validator.js';
import { getPackageVersion } from './utils.js';
import { EnvFileError } from './errors.js';

// ANSI colors — disabled when NO_COLOR or CI without color support
const useColor = !process.env.NO_COLOR && process.stdout.isTTY !== false;

const c = {
  green: (s) => (useColor ? `\x1b[32m${s}\x1b[0m` : s),
  red: (s) => (useColor ? `\x1b[31m${s}\x1b[0m` : s),
  yellow: (s) => (useColor ? `\x1b[33m${s}\x1b[0m` : s),
  bold: (s) => (useColor ? `\x1b[1m${s}\x1b[0m` : s),
  dim: (s) => (useColor ? `\x1b[2m${s}\x1b[0m` : s),
};

const VERSION = getPackageVersion();

/**
 * Prints the help text to stdout.
 */
function printHelp() {
  console.log(`
${c.bold('EnvKit')} v${VERSION}
Simple and powerful environment variable toolkit for Node.js.

${c.bold('Usage:')}
  envkit <command> [options]

${c.bold('Commands:')}
  check               Validate environment variables
                      Uses envkit.config.js if found in cwd.

${c.bold('Options:')}
  --env <file>        Path to .env file (default: .env)
  --config <file>     Path to envkit config file (default: envkit.config.js)
  --silent            Do not exit with error code on missing optional variables
  --version, -v       Print version
  --help, -h          Print this help message

${c.bold('Examples:')}
  envkit check
  envkit check --env .env.local
  envkit check --config envkit.config.js

${c.bold('Config file (envkit.config.js):')}
  export default {
    schema: {
      PORT:         { type: 'number', required: true },
      DATABASE_URL: { type: 'string', required: true },
      DEBUG:        { type: 'boolean', default: false },
    }
  };
`);
}

/**
 * Prints EnvKit version.
 */
function printVersion() {
  console.log(`envkit v${VERSION}`);
}

/**
 * Tries to load an envkit config file.
 * Supports: envkit.config.js (ESM default export).
 *
 * @param {string} configPath
 * @returns {Promise<object|null>}
 */
async function loadConfig(configPath) {
  const absolute = path.resolve(process.cwd(), configPath);
  if (!existsSync(absolute)) { return null; }
  try {
    // On Windows, dynamic import() requires a file:// URL, not a raw path.
    const { pathToFileURL } = await import('url');
    const mod = await import(pathToFileURL(absolute).href);
    return mod.default ?? mod;
  } catch (err) {
    console.error(c.red(`✗ Failed to load config file: ${configPath}`));
    console.error(c.dim(`  ${err instanceof Error ? err.message : String(err)}`));
    return null;
  }
}

/**
 * Runs `envkit check`.
 *
 * @param {object} opts
 * @param {string} opts.envFile
 * @param {string} opts.configFile
 */
async function runCheck({ envFile, configFile }) {
  const separator = '─'.repeat(44);
  console.log('');
  console.log(c.bold('EnvKit — Environment Validation'));
  console.log(c.dim(separator));
  console.log('');

  // 1. Load .env file
  try {
    loadEnv({ path: envFile, silent: false });
    console.log(c.dim(`  Loaded: ${envFile}`));
  } catch (err) {
    if (err instanceof EnvFileError) {
      console.log(c.yellow(`  ⚠ ${err.message}`));
      console.log(c.dim('  Continuing with existing environment variables.'));
    } else {
      throw err;
    }
  }

  console.log('');

  // 2. Load config
  const config = await loadConfig(configFile);

  if (!config || !config.schema) {
    // No schema — just list all currently set variables (no values!)
    console.log(c.dim('  No envkit.config.js found — listing environment keys only.'));
    console.log('');
    const envKeys = Object.keys(process.env);
    if (envKeys.length === 0) {
      console.log(c.dim('  No environment variables set.'));
    } else {
      for (const key of envKeys.sort()) {
        console.log(`  ${c.green('✓')} ${key}`);
      }
    }
    console.log('');
    console.log(c.green('✓ Done (no schema to validate)'));
    console.log('');
    process.exit(0);
    return;
  }

  // 3. Validate using schema
  const result = validateEnv({ schema: config.schema, throw: false });

  // Print per-variable status
  for (const key of Object.keys(config.schema)) {
    const hasError = result.errors.some((e) => e.key === key);
    const hasValue = key in result.values;
    if (hasError) {
      const err = result.errors.find((e) => e.key === key);
      console.log(`  ${c.red('✗')} ${c.bold(key)} — ${c.red(err.message)}`);
    } else if (hasValue) {
      console.log(`  ${c.green('✓')} ${c.bold(key)}`);
    } else {
      // Optional, absent
      const schema = config.schema[key];
      if ('default' in schema) {
        console.log(`  ${c.dim('·')} ${key} ${c.dim(`(default: ${schema.default})`)}`);
      } else {
        console.log(`  ${c.dim('·')} ${key} ${c.dim('(optional, not set)')}`);
      }
    }
  }

  console.log('');

  if (!result.valid) {
    const count = result.errors.length;
    console.log(c.red(`✗ Environment validation failed. ${count} error${count === 1 ? '' : 's'} found.`));
    console.log('');
    process.exit(1);
  } else {
    console.log(c.green('✓ Environment validation passed.'));
    console.log('');
    process.exit(0);
  }
}



/**
 * Parses process.argv and dispatches to the appropriate command.
 * @param {string[]} argv
 */
export async function runCli(argv = process.argv.slice(2)) {
  // Handle top-level flags
  if (argv.includes('--help') || argv.includes('-h') || argv.length === 0) {
    printHelp();
    process.exit(0);
  }

  if (argv.includes('--version') || argv.includes('-v')) {
    printVersion();
    process.exit(0);
  }

  const command = argv[0];

  if (command === 'check') {
    const args = argv.slice(1);
    const envFile = getFlag(args, '--env') ?? '.env';
    const configFile = getFlag(args, '--config') ?? 'envkit.config.js';
    await runCheck({ envFile, configFile });
  } else {
    console.error(c.red(`✗ Unknown command: ${command}`));
    console.error(c.dim('  Run `envkit --help` for usage.'));
    process.exit(1);
  }
}

/**
 * Extracts the value following a named flag.
 * e.g. getFlag(['--env', '.env.local'], '--env') → '.env.local'
 *
 * @param {string[]} args
 * @param {string} flag
 * @returns {string|null}
 */
function getFlag(args, flag) {
  const index = args.indexOf(flag);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
  return null;
}
