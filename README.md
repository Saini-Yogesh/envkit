# EnvKit

> Simple and powerful environment variable loading and validation toolkit for Node.js.

EnvKit helps you load `.env` files, validate required environment variables, enforce type constraints, and get friendly, actionable error messages — all with a minimal, intuitive API. It ships with a CLI for checking environment configuration in CI pipelines and during local development.

---

## Features

- **`.env` file loading** — single file, multiple files, with precedence control
- **Required variable validation** — fail fast on missing config
- **Schema-based validation** — types, constraints, choices, patterns, custom validators
- **Type coercion** — `string`, `number`, `boolean`, `url`, `json`
- **Defaults** — returned in config without mutating `process.env`
- **Structured errors** — `EnvValidationError` with per-variable error list
- **Security-first** — never exposes secret values in errors or CLI output
- **CLI** — `envkit check` for CI and local validation
- **Config file** — `envkit.config.js` for project-wide schema
- **TypeScript** — complete `.d.ts` declarations for all public APIs
- **Zero dependencies** — uses only Node.js built-ins
- **ESM** — native ES modules, Node.js ≥ 18

---

## Installation

```bash
npm install envkit
```

```bash
yarn add envkit
```

```bash
pnpm add envkit
```

**Requirements:** Node.js ≥ 18.0.0

---

## Quick Start

```js
import { loadEnv, validateEnv } from 'envkit';

// 1. Load .env file
loadEnv();

// 2. Validate and get typed config
const { values: config } = validateEnv({
  schema: {
    PORT:         { type: 'number', required: true },
    DATABASE_URL: { type: 'string', required: true },
    DEBUG:        { type: 'boolean', default: false },
  },
});

console.log(config.PORT);   // 3000 (number)
console.log(config.DEBUG);  // false (boolean)
```

---

## Loading `.env`

```js
import { loadEnv } from 'envkit';

// Load .env from cwd (default)
loadEnv();

// Custom file
loadEnv({ path: '.env.local' });

// Multiple files (first file has lowest precedence, last is highest when override: true)
loadEnv({ path: ['.env', '.env.local'] });

// Overwrite existing process.env values
loadEnv({ path: '.env', override: true });

// Silently ignore missing files
loadEnv({ path: '.env.optional', silent: true });
```

### Return value

```js
const result = loadEnv();

result.loaded;    // true/false
result.path;      // '.env' (or array)
result.variables; // ['PORT', 'DATABASE_URL'] — keys only, never values
result.files;     // files actually read
```

### Precedence rules

- Without `override: true`: existing `process.env` values are **never overwritten**.
- With multiple files: they are applied **left-to-right**. Without `override`, first file wins.
- With `override: true`: last file wins.

---

## Validating required variables

Simplest form — just check that variables exist:

```js
import { validateEnv } from 'envkit';

validateEnv({
  required: ['DATABASE_URL', 'JWT_SECRET', 'API_KEY'],
});
```

If any are missing, an `EnvValidationError` is thrown with a clear message.

---

## Schema validation

```js
const { values: config } = validateEnv({
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
    API_URL: {
      type: 'url',
      required: false,
    },
    DEBUG: {
      type: 'boolean',
      default: false,
    },
  },
});
```

### Supported types

| Type      | Description                                            |
|-----------|--------------------------------------------------------|
| `string`  | Any string value (default)                             |
| `number`  | Coerced from string; fails for non-numeric values      |
| `boolean` | Accepts `true/false/1/0/yes/no/on/off` (case-insensitive) |
| `url`     | Must be a valid `http://` or `https://` URL            |
| `json`    | Parsed with `JSON.parse`; returns the parsed object    |

### Supported constraints

| Constraint  | Types           | Description                                      |
|-------------|-----------------|--------------------------------------------------|
| `required`  | all             | Variable must be present                         |
| `default`   | all             | Used when variable is absent                     |
| `min`       | number, string  | Min value (number) or min length (string)        |
| `max`       | number, string  | Max value (number) or max length (string)        |
| `choices`   | string          | Value must be one of the listed strings          |
| `pattern`   | string          | Value must match a RegExp or pattern string      |
| `validate`  | all             | Custom function: return `true` or error message  |

---

## Type conversion

Environment variables are strings by default. EnvKit converts them safely:

```js
// .env: PORT=3000, DEBUG=true
const { values: config } = validateEnv({
  schema: {
    PORT:  { type: 'number', required: true },
    DEBUG: { type: 'boolean', required: true },
  },
});

typeof config.PORT;  // 'number'
typeof config.DEBUG; // 'boolean'
```

Invalid values produce clear errors:

```
✗ PORT must be a number (received a non-numeric value)
```

---

## Defaults

Defaults are returned in the config object and **do not mutate `process.env`**:

```js
const { values: config } = validateEnv({
  schema: {
    PORT: { type: 'number', default: 3000 },
    HOST: { type: 'string', default: 'localhost' },
  },
});

config.PORT;              // 3000 (if PORT not in env)
process.env.PORT;         // undefined (not mutated)
```

---

## Validation result

`validateEnv` always returns a structured result object:

```js
const result = validateEnv({ schema: { PORT: { type: 'number' } }, throw: false });

result.valid;     // boolean
result.values;    // { PORT: 3000 } — typed values
result.errors;    // [] or array of { key, code, message }
```

Error object shape:

```js
{
  key: 'PORT',
  code: 'INVALID_TYPE',       // MISSING_VARIABLE | INVALID_TYPE | OUT_OF_RANGE
  message: 'PORT must be a number (received a non-numeric value)',
}
```

By default, `validateEnv` **throws** `EnvValidationError` on failure. Pass `throw: false` to suppress throwing and handle errors manually.

---

## CLI

```bash
# Show help
envkit --help
envkit -h

# Check version
envkit --version

# Validate environment (auto-detects envkit.config.js)
envkit check

# Use a custom .env file
envkit check --env .env.local

# Use a custom config file
envkit check --config my-envkit.config.js
```

### Example output

```
EnvKit — Environment Validation
────────────────────────────────────────────

  Loaded: .env

  ✓ PORT
  ✓ DATABASE_URL
  ✗ JWT_SECRET — JWT_SECRET is required but was not found
  · DEBUG (default: false)

✗ Environment validation failed. 1 error found.
```

**Exit codes:**
- `0` — validation passed
- `1` — validation failed
- `2` — unexpected error

---

## Configuration

Create `envkit.config.js` in your project root:

```js
// envkit.config.js
export default {
  schema: {
    PORT: {
      type: 'number',
      required: true,
      min: 1,
      max: 65535,
    },
    DATABASE_URL: {
      type: 'string',
      required: true,
    },
    NODE_ENV: {
      type: 'string',
      required: true,
      choices: ['development', 'production', 'test'],
    },
    DEBUG: {
      type: 'boolean',
      default: false,
    },
  },
};
```

Then run:

```bash
npx envkit check
```

---

## Error handling

```js
import { loadEnv, validateEnv, EnvValidationError, EnvFileError } from 'envkit';

try {
  loadEnv();
} catch (err) {
  if (err instanceof EnvFileError) {
    console.error('Could not load .env file:', err.message);
    process.exit(1);
  }
}

try {
  validateEnv({ required: ['DATABASE_URL'] });
} catch (err) {
  if (err instanceof EnvValidationError) {
    // err.errors is an array of { key, code, message }
    console.error(err.format());
    process.exit(1);
  }
}
```

### Error classes

| Class               | When thrown                                                |
|---------------------|------------------------------------------------------------|
| `EnvKitError`       | Base class; extends `Error`; has `.code` property         |
| `EnvFileError`      | `.env` file not found or unreadable; has `.filePath`       |
| `EnvValidationError`| Validation failed; has `.errors[]` and `.format()` method |

---

## TypeScript

EnvKit ships with complete `.d.ts` type declarations:

```ts
import { loadEnv, validateEnv, EnvValidationError } from 'envkit';
import type { LoadEnvOptions, ValidateEnvOptions, EnvSchema } from 'envkit';

loadEnv({ path: '.env' });

const config = validateEnv({
  schema: {
    PORT:  { type: 'number', required: true },
    DEBUG: { type: 'boolean', default: false },
  },
});

// config.values is Record<string, unknown>
console.log(config.values.PORT);
```

---

## API Reference

### `loadEnv(options?): LoadEnvResult`

Loads one or more `.env` files into `process.env`.

| Option      | Type               | Default  | Description                                     |
|-------------|--------------------|----------|-------------------------------------------------|
| `path`      | `string\|string[]` | `'.env'` | File path(s) to load                            |
| `override`  | `boolean`          | `false`  | Overwrite existing process.env values           |
| `silent`    | `boolean`          | `false`  | Silently ignore missing files                   |

**Returns:** `{ loaded, path, variables, files }`

---

### `validateEnv(options?): ValidateEnvResult`

Validates environment variables. Throws `EnvValidationError` by default on failure.

| Option     | Type                        | Default | Description                               |
|------------|-----------------------------|---------|-------------------------------------------|
| `required` | `string[]`                  | `[]`    | List of required variable names           |
| `schema`   | `Record<string, FieldSchema>`| `{}`   | Full schema definition                    |
| `throw`    | `boolean`                   | `true`  | Throw on validation failure               |

**Returns:** `{ valid, values, errors }`

---

### `env`

A live proxy over `process.env`. Reads at access time — always reflects the current state.

```js
import { env } from 'envkit';
env.PORT;         // process.env.PORT
env.DATABASE_URL; // process.env.DATABASE_URL
```

---

## Security

EnvKit is designed with security in mind:

- **Secret values are never exposed** in error messages, logs, or CLI output
- **`process.env` is not logged** or serialised anywhere
- **Defaults do not mutate `process.env`** — they're only in the returned config
- **`.env` files are excluded from npm** via `.npmignore`
- **`.gitignore`** includes `.env` and `.env.*` (except `.env.example`)

Never commit real credentials. Use `.env.example` with placeholder values.

---

## Examples

See the [`examples/`](./examples/) directory:

| File | Description |
|------|-------------|
| [`basic.js`](./examples/basic.js) | Loading `.env` and accessing variables |
| [`validation.js`](./examples/validation.js) | Schema validation and type coercion |
| [`express.js`](./examples/express.js) | Express application startup pattern |
| [`custom-schema.js`](./examples/custom-schema.js) | Production-style full schema |

---

## Development

```bash
git clone https://github.com/saini-yogesh/envkit.git
cd envkit
npm install
npm test
npm run lint
```

---

## Testing

```bash
npm test
```

Tests use Node.js's built-in test runner (`node:test`). No external testing framework required.

Test coverage includes:
- Parser edge cases (quotes, escapes, comments, duplicates)
- Loader (multi-file, override, silent, missing files)
- Validator (all types, all constraints, defaults, errors)
- CLI (exit codes, output, secrets not leaked)
- Integration (full app startup simulation)

---

## Publishing

```bash
# Verify npm authentication
npm login
npm whoami

# Dry run — inspect what will be published
npm publish --dry-run

# Build the tarball
npm pack

# Publish
npm publish
```

> **Note:** Replace `REPLACE_WITH_YOUR_USERNAME` in `package.json` with your actual GitHub username before publishing.

---

## Contributing

Contributions are welcome. Please:

1. Fork the repository
2. Create a feature branch
3. Write or update tests
4. Run `npm run check` (lint + test)
5. Open a pull request

---

## License

MIT — see [LICENSE](./LICENSE)