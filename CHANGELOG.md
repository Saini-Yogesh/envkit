# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] — 2026-09-09

### Added

- **Environment file loading** (`loadEnv`) — loads `.env` files into `process.env`
  - Supports single files and arrays of files with left-to-right precedence
  - Safe by default: does not overwrite existing `process.env` values
  - `override: true` option to explicitly allow overwriting
  - `silent: true` option to suppress missing-file errors
  - Returns structured result: `{ loaded, path, variables, files }` (no secret values)
- **Environment validation** (`validateEnv`)
  - Simple `required` list shorthand
  - Full schema-based validation with per-field configuration
  - Supported types: `string`, `number`, `boolean`, `url`, `json`
  - Type coercion: raw strings are safely converted to proper JS types
  - Constraints: `min`, `max`, `choices`, `pattern`, custom `validate` function
  - Defaults: returned in config without mutating `process.env`
  - Structured result: `{ valid, values, errors }`
  - Throws `EnvValidationError` by default; suppressed with `throw: false`
- **`env` proxy** — live, read-through proxy over `process.env`
- **Custom error classes**: `EnvKitError`, `EnvFileError`, `EnvValidationError`
  - `EnvValidationError.format()` for human-readable error summaries
  - No secret values ever exposed in error messages
- **CLI** (`envkit`)
  - `envkit check` — validates environment against a schema
  - `--env <file>` flag to specify a custom `.env` file
  - `--config <file>` flag to specify a custom config file
  - Auto-detection of `envkit.config.js` in the project root
  - `--help` / `-h` — prints usage
  - `--version` / `-v` — prints version
  - CI-friendly: no color when `NO_COLOR` is set or non-TTY
  - Exit code `0` on success, `1` on validation failure, `2` on unexpected error
- **Config file** (`envkit.config.js`) — project-wide schema definition
- **TypeScript declarations** — complete `.d.ts` file for all public APIs
- **Zero runtime dependencies** — uses only Node.js built-ins
- **`.env.example`** — template with safe placeholder values
- **Examples** — `basic.js`, `validation.js`, `express.js`, `custom-schema.js`
- **Test suite** — Node.js built-in `node:test` runner, covering parser, loader, validator, CLI, and integration scenarios
