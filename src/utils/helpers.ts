/**
 * Format a number with specified decimal places, trimming trailing zeros.
 */
export function formatNumber(value: string | number, decimals = 8): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);
  return parseFloat(num.toFixed(decimals)).toString();
}

/**
 * Format side string from boolean.
 */
export function formatSide(isBuy: boolean): string {
  return isBuy ? 'BUY' : 'SELL';
}

/**
 * Parse an integer strictly, throwing on failure.
 */
export function parseIntStrict(value: string, name: string): number {
  const n = parseInt(value, 10);
  if (isNaN(n)) {
    throw new Error(`Invalid ${name}: "${value}" is not a valid integer`);
  }
  return n;
}

/**
 * Remove trailing zeros from a number string (for signing).
 * "30000.00" -> "30000.0" (keep at least one decimal)
 */
export function removeTrailingZeros(value: string): string {
  if (!value.includes('.')) return value;
  let trimmed = value.replace(/0+$/, '');
  if (trimmed.endsWith('.')) trimmed += '0';
  return trimmed;
}

/**
 * Convert a float to an integer with specified decimal precision (for hashing).
 */
export function floatToIntForHashing(value: number | string, decimals = 8): number {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return Math.round(num * 10 ** decimals);
}

/**
 * Convert USD amount to 6-decimal integer representation.
 */
export function floatToUsdInt(value: number | string): number {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return Math.round(num * 1e6);
}

/**
 * Parse a float strictly, throwing on failure.
 */
export function parseFloatStrict(value: string, name: string): number {
  const n = parseFloat(value);
  if (isNaN(n)) {
    throw new Error(`Invalid ${name}: "${value}" is not a valid number`);
  }
  return n;
}

/**
 * Convert a float to wire format string with appropriate precision.
 */
export function floatToWire(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) {
    throw new Error(`Invalid number: "${value}"`);
  }
  const result = num.toFixed(8);
  return removeTrailingZeros(result);
}

/**
 * Timestamp in milliseconds.
 */
export function nowMs(): number {
  return Date.now();
}

/**
 * Format Unix timestamp (ms) to ISO string.
 */
export function formatTimestamp(ms: number): string {
  return new Date(ms).toISOString();
}
