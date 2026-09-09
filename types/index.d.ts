/**
 * EnvKit — TypeScript type declarations
 * @module envkit
 */

// ─── Loader ──────────────────────────────────────────────────────────────────

/**
 * Options accepted by {@link loadEnv}.
 */
export interface LoadEnvOptions {
  /**
   * Path(s) to the .env file(s) to load.
   * When multiple paths are provided, they are processed left-to-right.
   * @default '.env'
   */
  path?: string | string[];

  /**
   * When true, existing process.env values are overwritten by the loaded file.
   * @default false
   */
  override?: boolean;

  /**
   * When true, missing files are silently ignored instead of throwing an error.
   * @default false
   */
  silent?: boolean;
}

/**
 * Result returned by {@link loadEnv}.
 */
export interface LoadEnvResult {
  /** Whether at least one file was successfully loaded. */
  loaded: boolean;
  /** The file path(s) that were attempted. */
  path: string | string[];
  /** Names of variables that were actually set in process.env (not their values). */
  variables: string[];
  /** Paths of files that were actually read. */
  files: string[];
}

/**
 * Loads one or more .env files and populates process.env.
 *
 * @example
 * import { loadEnv } from 'envkit';
 * loadEnv();
 * loadEnv({ path: '.env.local', override: true });
 * loadEnv({ path: ['.env', '.env.local'], silent: true });
 */
export function loadEnv(options?: LoadEnvOptions): LoadEnvResult;

// ─── Validator ────────────────────────────────────────────────────────────────

/** Supported environment variable types. */
export type EnvType = 'string' | 'number' | 'boolean' | 'url' | 'json';

/**
 * Schema definition for a single environment variable.
 */
export interface FieldSchema {
  /** Expected type. Defaults to 'string'. */
  type?: EnvType;
  /** Whether the variable must be present. Defaults to false. */
  required?: boolean;
  /** Default value used when the variable is absent. */
  default?: unknown;
  /**
   * For 'number': minimum allowed value.
   * For 'string': minimum allowed length.
   */
  min?: number;
  /**
   * For 'number': maximum allowed value.
   * For 'string': maximum allowed length.
   */
  max?: number;
  /** Allowed values (for type 'string'). */
  choices?: string[];
  /** Regex pattern the value must match (for type 'string'). */
  pattern?: RegExp | string;
  /** Custom validation function. Return true to pass, or an error message string. */
  validate?: (value: unknown) => true | string;
}

/**
 * Full schema: a map of variable name → field definition.
 */
export type EnvSchema = Record<string, FieldSchema>;

/**
 * A single validation error entry.
 */
export interface ValidationError {
  /** The environment variable key. */
  key: string;
  /** Error code for programmatic handling. */
  code:
    | 'MISSING_VARIABLE'
    | 'INVALID_TYPE'
    | 'OUT_OF_RANGE'
    | 'INVALID_CHOICE'
    | 'PATTERN_MISMATCH'
    | 'CUSTOM_VALIDATION_FAILED'
    | 'UNKNOWN_TYPE';
  /** Human-readable error message. Never contains the actual variable value. */
  message: string;
}

/**
 * Structured result returned when throw is false.
 */
export interface ValidateEnvResult {
  valid: boolean;
  /** Typed, coerced configuration values. */
  values: Record<string, unknown>;
  errors: ValidationError[];
}

/**
 * Options for {@link validateEnv}.
 */
export interface ValidateEnvOptions {
  /**
   * Simple list of required variable names.
   * Shorthand for schema entries with required: true, type: 'string'.
   */
  required?: string[];
  /** Full schema definition. */
  schema?: EnvSchema;
  /**
   * When true (default), throws an {@link EnvValidationError} on failure.
   * When false, returns the result object without throwing.
   * @default true
   */
  throw?: boolean;
}

/**
 * Validates environment variables against a schema or required list.
 * Returns a typed configuration object with coerced values.
 *
 * @throws {EnvValidationError} When validation fails and throw is not false.
 *
 * @example
 * import { validateEnv } from 'envkit';
 *
 * // Simple required check
 * validateEnv({ required: ['DATABASE_URL', 'JWT_SECRET'] });
 *
 * // Full schema
 * const config = validateEnv({
 *   schema: {
 *     PORT:         { type: 'number', required: true, min: 1, max: 65535 },
 *     DATABASE_URL: { type: 'string', required: true },
 *     NODE_ENV:     { type: 'string', choices: ['development', 'production', 'test'] },
 *     DEBUG:        { type: 'boolean', default: false },
 *   }
 * });
 *
 * config.values.PORT; // number
 */
export function validateEnv(options?: ValidateEnvOptions): ValidateEnvResult;

// ─── env Proxy ────────────────────────────────────────────────────────────────

/**
 * A live proxy over process.env.
 * Reads values at access time — always reflects the current environment.
 *
 * @example
 * import { env } from 'envkit';
 * console.log(env.PORT);
 * console.log(env.DATABASE_URL);
 */
export const env: NodeJS.ProcessEnv;

// ─── Errors ───────────────────────────────────────────────────────────────────

/** Base error class for all EnvKit errors. */
export class EnvKitError extends Error {
  readonly code: string;
  constructor(message: string, code?: string);
}

/** Thrown when a .env file cannot be found or read. */
export class EnvFileError extends EnvKitError {
  readonly filePath: string;
  constructor(message: string, filePath: string);
}

/** Thrown when environment validation fails. Contains structured error details. */
export class EnvValidationError extends EnvKitError {
  readonly errors: ValidationError[];
  constructor(message: string, errors: ValidationError[]);
  /** Returns a formatted, human-readable summary of all validation errors. */
  format(): string;
}
