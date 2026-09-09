/**
 * EnvKit - Custom Error Classes
 *
 * Provides structured, developer-friendly error types.
 * Never exposes secret values in error messages.
 */

/**
 * Base error class for all EnvKit errors.
 */
export class EnvKitError extends Error {
  /**
   * @param {string} message
   * @param {string} [code]
   */
  constructor(message, code = 'ENVKIT_ERROR') {
    super(message);
    this.name = 'EnvKitError';
    this.code = code;
  }
}

/**
 * Thrown when .env file cannot be read or parsed.
 */
export class EnvFileError extends EnvKitError {
  /**
   * @param {string} message
   * @param {string} filePath
   */
  constructor(message, filePath) {
    super(message, 'ENV_FILE_ERROR');
    this.name = 'EnvFileError';
    this.filePath = filePath;
  }
}

/**
 * Thrown when environment validation fails.
 * Contains structured error details without exposing secret values.
 */
export class EnvValidationError extends EnvKitError {
  /**
   * @param {string} message
   * @param {Array<{key: string, code: string, message: string}>} errors
   */
  constructor(message, errors) {
    super(message, 'ENV_VALIDATION_ERROR');
    this.name = 'EnvValidationError';
    /** @type {Array<{key: string, code: string, message: string}>} */
    this.errors = errors;
  }

  /**
   * Returns a formatted, human-readable error summary.
   * @returns {string}
   */
  format() {
    const lines = ['Environment validation failed.', ''];
    for (const err of this.errors) {
      lines.push(`  ✗ ${err.key}: ${err.message}`);
    }
    return lines.join('\n');
  }
}
