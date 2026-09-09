/**
 * Tests for the .env parser (src/parser.js)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseEnvContent } from '../src/parser.js';

describe('parseEnvContent', () => {
  it('parses simple key=value pairs', () => {
    const result = parseEnvContent('PORT=3000\nHOST=localhost');
    assert.equal(result.get('PORT'), '3000');
    assert.equal(result.get('HOST'), 'localhost');
  });

  it('skips blank lines', () => {
    const result = parseEnvContent('\nPORT=3000\n\n');
    assert.equal(result.size, 1);
    assert.equal(result.get('PORT'), '3000');
  });

  it('skips comment lines starting with #', () => {
    const result = parseEnvContent('# This is a comment\nPORT=3000');
    assert.equal(result.size, 1);
    assert.equal(result.get('PORT'), '3000');
  });

  it('strips leading/trailing whitespace from keys', () => {
    const result = parseEnvContent('  PORT  =3000');
    assert.equal(result.get('PORT'), '3000');
  });

  it('handles double-quoted values', () => {
    const result = parseEnvContent('API_KEY="abc123"');
    assert.equal(result.get('API_KEY'), 'abc123');
  });

  it('handles single-quoted values', () => {
    const result = parseEnvContent("API_KEY='abc123'");
    assert.equal(result.get('API_KEY'), 'abc123');
  });

  it('handles empty values', () => {
    const result = parseEnvContent('EMPTY_VALUE=');
    assert.equal(result.get('EMPTY_VALUE'), '');
  });

  it('handles values with spaces in double quotes', () => {
    const result = parseEnvContent('MSG="hello world"');
    assert.equal(result.get('MSG'), 'hello world');
  });

  it('handles escape sequences in double-quoted values', () => {
    const result = parseEnvContent('MSG="line1\\nline2"');
    assert.equal(result.get('MSG'), 'line1\nline2');
  });

  it('does NOT process escape sequences in single-quoted values', () => {
    const result = parseEnvContent("MSG='line1\\nline2'");
    assert.equal(result.get('MSG'), 'line1\\nline2');
  });

  it('strips inline comments from unquoted values', () => {
    const result = parseEnvContent('PORT=3000 # port number');
    assert.equal(result.get('PORT'), '3000');
  });

  it('handles duplicate keys - last one wins', () => {
    const result = parseEnvContent('PORT=3000\nPORT=4000');
    assert.equal(result.get('PORT'), '4000');
  });

  it('preserves order (Map)', () => {
    const result = parseEnvContent('B=2\nA=1\nC=3');
    const keys = Array.from(result.keys());
    assert.deepEqual(keys, ['B', 'A', 'C']);
  });

  it('handles CRLF line endings', () => {
    const result = parseEnvContent('PORT=3000\r\nHOST=localhost\r\n');
    assert.equal(result.get('PORT'), '3000');
    assert.equal(result.get('HOST'), 'localhost');
  });

  it('ignores lines without = separator', () => {
    const result = parseEnvContent('INVALID_LINE\nPORT=3000');
    assert.equal(result.get('PORT'), '3000');
    assert.ok(!result.has('INVALID_LINE'));
  });

  it('handles DATABASE_URL with complex value', () => {
    const result = parseEnvContent('DATABASE_URL=mongodb://localhost:27017/app');
    assert.equal(result.get('DATABASE_URL'), 'mongodb://localhost:27017/app');
  });

  it('returns an empty Map for empty content', () => {
    const result = parseEnvContent('');
    assert.equal(result.size, 0);
  });

  it('handles values that contain = signs', () => {
    const result = parseEnvContent('DATA=a=b=c');
    assert.equal(result.get('DATA'), 'a=b=c');
  });
});
