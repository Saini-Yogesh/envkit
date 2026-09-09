/**
 * EnvKit - Environment Variable Validator
 *
 * Validates environment variables against a schema or a required list.
 * Performs type coercion and returns a typed configuration object.
 * Never exposes secret values in errors.
 */

import { EnvValidationError } from './errors.js';
import { isValidUrl, tryParseJson, parseBoolean, parseNumber } from './utils.js';

/**
 * @typedef {'string' | 'number' | 'boolean' | 'url' | 'json'} EnvType
 */

/**
 * @typedef {Object} FieldSchema
 * @property {EnvType} [type='string'] - Expected type of the variable.
 * @property {boolean} [required=false] - Whether the variable must be present.
 * @property {*} [default] - Default value if the variable is absent.
 * @property {number} [min] - Minimum numeric value (type: 'number') or minimum string length (type: 'string').
 * @property {number} [max] - Maximum numeric value (type: 'number') or maximum string length (type: 'string').
 * @property {string[]} [choices] - Allowed string values.
 * @property {RegExp | string} [pattern] - Regex pattern the string must match.
 * @property {(value: *) => true | string} [validate] - Custom validator; return true or an error message string.
 */

/**
 * @typedef {Object} ValidateEnvOptions
 * @property {string[]} [required] - Simple list of required variable names (shorthand for schema with required:true).
 * @property {Record<string, FieldSchema>} [schema] - Full schema definition.
 * @property {boolean} [throw=true] - If true (default), throw EnvValidationError on failure.
 */

/**
 * @typedef {Object} ValidateEnvResult
 * @property {boolean} valid
 * @property {Record<string, *>} values - Typed, coerced configuration values.
 * @property {Array<{key: string, code: string, message: string}>} errors
 */

/**
 * Validates environment variables.
 *
 * Usage (simple):
 *   validateEnv({ required: ['DATABASE_URL', 'JWT_SECRET'] });
 *
 * Usage (schema):
 *   validateEnv({ schema: { PORT: { type: 'number', required: true } } });
 *
 * @param {ValidateEnvOptions} options
 * @returns {Record<string, *>} Validated, coerced configuration values.
 * @throws {EnvValidationError} When validation fails and throw is not false.
 */
export function validateEnv(options = {}) {
  const { required = [], schema = {}, throw: shouldThrow = true } = options;

  /** @type {Array<{key: string, code: string, message: string}>} */
  const errors = [];

  /** @type {Record<string, *>} */
  const values = {};

  // Build an effective schema: merge simple required list into schema
  const effectiveSchema = { ...schema };
  for (const key of required) {
    if (!effectiveSchema[key]) {
      effectiveSchema[key] = { required: true, type: 'string' };
    } else {
      effectiveSchema[key] = { ...effectiveSchema[key], required: true };
    }
  }

  for (const [key, fieldSchema] of Object.entries(effectiveSchema)) {
    const rawValue = process.env[key];
    const isPresent = rawValue !== undefined && rawValue !== null;
    const isEmpty = !isPresent || rawValue === '';

    const type = fieldSchema.type ?? 'string';
    const isRequired = fieldSchema.required ?? false;

    // Handle missing / empty
    if (isEmpty) {
      if ('default' in fieldSchema) {
        values[key] = fieldSchema.default;
        continue;
      }
      if (isRequired) {
        errors.push({
          key,
          code: 'MISSING_VARIABLE',
          message: `${key} is required but was not found`,
        });
        continue;
      }
      // Optional and absent — skip
      continue;
    }

    // Coerce and validate
    const coercionResult = coerceValue(key, rawValue, type, fieldSchema);
    if (coercionResult.error) {
      errors.push(coercionResult.error);
      continue;
    }

    const coercedValue = coercionResult.value;

    // Run constraint checks
    const constraintErrors = checkConstraints(key, coercedValue, rawValue, type, fieldSchema);
    if (constraintErrors.length > 0) {
      errors.push(...constraintErrors);
      continue;
    }

    values[key] = coercedValue;
  }

  if (errors.length > 0) {
    if (shouldThrow) {
      const message = formatValidationMessage(errors);
      throw new EnvValidationError(message, errors);
    }
    return { valid: false, values, errors };
  }

  return { valid: true, values, errors: [] };
}

/**
 * Coerces a raw string value to the specified type.
 *
 * @param {string} key
 * @param {string} rawValue
 * @param {EnvType} type
 * @param {FieldSchema} _schema
 * @returns {{ value?: *, error?: {key: string, code: string, message: string} }}
 */
function coerceValue(key, rawValue, type, _schema) {
  switch (type) {
    case 'string': {
      return { value: rawValue };
    }

    case 'number': {
      const result = parseNumber(rawValue);
      if (!result.ok) {
        return {
          error: {
            key,
            code: 'INVALID_TYPE',
            message: `${key} must be a number (received a non-numeric value)`,
          },
        };
      }
      return { value: result.value };
    }

    case 'boolean': {
      const result = parseBoolean(rawValue);
      if (!result.ok) {
        return {
          error: {
            key,
            code: 'INVALID_TYPE',
            message: `${key} must be a boolean (accepted: true, false, 1, 0, yes, no, on, off)`,
          },
        };
      }
      return { value: result.value };
    }

    case 'url': {
      if (!isValidUrl(rawValue)) {
        return {
          error: {
            key,
            code: 'INVALID_TYPE',
            message: `${key} must be a valid HTTP or HTTPS URL`,
          },
        };
      }
      return { value: rawValue };
    }

    case 'json': {
      const result = tryParseJson(rawValue);
      if (!result.ok) {
        return {
          error: {
            key,
            code: 'INVALID_TYPE',
            message: `${key} must be valid JSON`,
          },
        };
      }
      return { value: result.value };
    }

    default: {
      return {
        error: {
          key,
          code: 'UNKNOWN_TYPE',
          message: `${key} has unknown type "${type}"`,
        },
      };
    }
  }
}

/**
 * Runs constraint checks (min, max, choices, pattern, custom validate).
 *
 * @param {string} key
 * @param {*} value - Coerced value
 * @param {string} rawValue - Original string value
 * @param {EnvType} type
 * @param {FieldSchema} schema
 * @returns {Array<{key: string, code: string, message: string}>}
 */
function checkConstraints(key, value, rawValue, type, schema) {
  const errors = [];

  // min / max
  if (type === 'number') {
    if (schema.min !== undefined && value < schema.min) {
      errors.push({
        key,
        code: 'OUT_OF_RANGE',
        message: `${key} must be at least ${schema.min} (received ${value})`,
      });
    }
    if (schema.max !== undefined && value > schema.max) {
      errors.push({
        key,
        code: 'OUT_OF_RANGE',
        message: `${key} must be at most ${schema.max} (received ${value})`,
      });
    }
  }

  if (type === 'string') {
    if (schema.min !== undefined && value.length < schema.min) {
      errors.push({
        key,
        code: 'OUT_OF_RANGE',
        message: `${key} must have at least ${schema.min} characters`,
      });
    }
    if (schema.max !== undefined && value.length > schema.max) {
      errors.push({
        key,
        code: 'OUT_OF_RANGE',
        message: `${key} must have at most ${schema.max} characters`,
      });
    }
  }

  // choices
  if (schema.choices !== undefined && type === 'string') {
    if (!schema.choices.includes(value)) {
      errors.push({
        key,
        code: 'INVALID_CHOICE',
        message: `${key} must be one of: ${schema.choices.join(', ')}`,
      });
    }
  }

  // pattern
  if (schema.pattern !== undefined && type === 'string') {
    const regex = schema.pattern instanceof RegExp ? schema.pattern : new RegExp(schema.pattern);
    if (!regex.test(value)) {
      errors.push({
        key,
        code: 'PATTERN_MISMATCH',
        message: `${key} does not match required pattern`,
      });
    }
  }

  // custom validator
  if (typeof schema.validate === 'function') {
    const result = schema.validate(value);
    if (result !== true) {
      errors.push({
        key,
        code: 'CUSTOM_VALIDATION_FAILED',
        message: typeof result === 'string' ? result : `${key} failed custom validation`,
      });
    }
  }

  return errors;
}

/**
 * Formats a list of validation errors into a human-readable message.
 * @param {Array<{key: string, code: string, message: string}>} errors
 * @returns {string}
 */
function formatValidationMessage(errors) {
  const lines = ['Environment validation failed:', ''];
  for (const err of errors) {
    lines.push(`  ✗ ${err.message}`);
  }
  return lines.join('\n');
}
