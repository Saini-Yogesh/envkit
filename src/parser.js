/**
 * EnvKit - .env File Parser
 *
 * Parses .env file content into a key-value map.
 * Handles: comments, whitespace, quoted values, empty values,
 * escaped characters, and duplicate keys.
 */

/**
 * Parses a single line from a .env file.
 * Returns null for blank lines and comments.
 *
 * @param {string} line
 * @param {number} lineNumber - 1-indexed, used for error messages
 * @returns {{ key: string, value: string } | null}
 */
function parseLine(line, _lineNumber) {
  // Strip trailing whitespace/newline
  const trimmed = line.trim();

  // Skip empty lines and comments
  if (trimmed === '' || trimmed.startsWith('#')) {
    return null;
  }

  // Find the first '=' separator
  const eqIndex = trimmed.indexOf('=');
  if (eqIndex === -1) {
    // Not a valid key=value pair – skip silently (common in some .env styles)
    return null;
  }

  const rawKey = trimmed.slice(0, eqIndex).trim();
  const rawValue = trimmed.slice(eqIndex + 1);

  if (!rawKey) {
    return null;
  }

  const value = parseValue(rawValue);

  return { key: rawKey, value };
}

/**
 * Parses a raw value string from a .env line.
 * Handles single-quoted, double-quoted, and unquoted values.
 * Handles inline comments for unquoted values.
 *
 * @param {string} raw
 * @returns {string}
 */
function parseValue(raw) {
  // Empty value
  if (raw === '' || raw === undefined) {
    return '';
  }

  const trimmed = raw.trim();

  // Double-quoted value: "value with spaces"
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    const inner = trimmed.slice(1, -1);
    return unescapeDoubleQuoted(inner);
  }

  // Single-quoted value: 'value' (no escape processing)
  if (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2) {
    return trimmed.slice(1, -1);
  }

  // Unquoted: strip inline comments (# preceded by whitespace)
  const commentIndex = findInlineComment(trimmed);
  const withoutComment = commentIndex !== -1 ? trimmed.slice(0, commentIndex).trimEnd() : trimmed;

  return withoutComment;
}

/**
 * Finds the index of an inline comment (whitespace followed by #).
 * Returns -1 if none found.
 *
 * @param {string} value
 * @returns {number}
 */
function findInlineComment(value) {
  for (let i = 0; i < value.length - 1; i++) {
    if ((value[i] === ' ' || value[i] === '\t') && value[i + 1] === '#') {
      return i;
    }
  }
  return -1;
}

/**
 * Processes escape sequences inside double-quoted values.
 * Supports: \n, \r, \t, \\, \"
 *
 * @param {string} str
 * @returns {string}
 */
function unescapeDoubleQuoted(str) {
  return str.replace(/\\(n|r|t|\\|")/g, (_, ch) => {
    switch (ch) {
      case 'n': return '\n';
      case 'r': return '\r';
      case 't': return '\t';
      case '\\': return '\\';
      case '"': return '"';
      default: return ch;
    }
  });
}

/**
 * Parses the full content of a .env file.
 *
 * @param {string} content - Raw file content
 * @returns {Map<string, string>} Ordered map of key → value
 */
export function parseEnvContent(content) {
  const result = new Map();
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const parsed = parseLine(lines[i], i + 1);
    if (parsed !== null) {
      // Last definition wins for duplicate keys (consistent with dotenv behavior)
      result.set(parsed.key, parsed.value);
    }
  }

  return result;
}
