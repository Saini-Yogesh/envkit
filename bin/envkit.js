#!/usr/bin/env node
/**
 * EnvKit CLI entry point.
 * Invoked when running: envkit <command>
 */

import { runCli } from '../src/cli.js';

runCli().catch((err) => {
  console.error(`\nEnvKit encountered an unexpected error:\n  ${err.message}`);
  process.exit(2);
});
