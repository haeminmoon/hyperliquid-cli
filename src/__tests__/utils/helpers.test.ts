import {
  formatNumber,
  formatSide,
  parseIntStrict,
  parseFloatStrict,
  removeTrailingZeros,
  floatToIntForHashing,
  floatToUsdInt,
  floatToWire,
  nowMs,
  formatTimestamp,
} from '../../utils/helpers';

describe('formatNumber', () => {
  it('formats integer values', () => {
    expect(formatNumber(100)).toBe('100');
  });

  it('formats decimal values with default precision', () => {
    expect(formatNumber(3.14159265358979)).toBe('3.14159265');
  });

  it('formats with custom decimal places', () => {
    expect(formatNumber(3.14159, 2)).toBe('3.14');
  });

  it('trims trailing zeros', () => {
    expect(formatNumber(10.5, 4)).toBe('10.5');
  });

  it('handles zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('handles negative numbers', () => {
    expect(formatNumber(-5.5, 2)).toBe('-5.5');
  });

  it('handles string input', () => {
    expect(formatNumber('123.456', 2)).toBe('123.46');
  });

  it('returns original string for NaN input', () => {
    expect(formatNumber('not-a-number')).toBe('not-a-number');
  });

  it('handles very large numbers', () => {
    expect(formatNumber(1e15)).toBe('1000000000000000');
  });
});

describe('formatSide', () => {
  it('returns BUY for true', () => {
    expect(formatSide(true)).toBe('BUY');
  });

  it('returns SELL for false', () => {
    expect(formatSide(false)).toBe('SELL');
  });
});

describe('parseIntStrict', () => {
  it('parses valid integer string', () => {
    expect(parseIntStrict('42', 'test')).toBe(42);
  });

  it('parses negative integer', () => {
    expect(parseIntStrict('-10', 'test')).toBe(-10);
  });

  it('parses zero', () => {
    expect(parseIntStrict('0', 'test')).toBe(0);
  });

  it('truncates decimal part', () => {
    expect(parseIntStrict('3.7', 'test')).toBe(3);
  });

  it('throws on non-numeric string', () => {
    expect(() => parseIntStrict('abc', 'delay')).toThrow(
      'Invalid delay: "abc" is not a valid integer',
    );
  });

  it('throws on empty string', () => {
    expect(() => parseIntStrict('', 'count')).toThrow(
      'Invalid count: "" is not a valid integer',
    );
  });
});

describe('parseFloatStrict', () => {
  it('parses valid float string', () => {
    expect(parseFloatStrict('3.14', 'price')).toBeCloseTo(3.14);
  });

  it('parses integer string', () => {
    expect(parseFloatStrict('100', 'amount')).toBe(100);
  });

  it('throws on non-numeric string', () => {
    expect(() => parseFloatStrict('xyz', 'price')).toThrow(
      'Invalid price: "xyz" is not a valid number',
    );
  });

  it('throws on empty string', () => {
    expect(() => parseFloatStrict('', 'amount')).toThrow(
      'Invalid amount: "" is not a valid number',
    );
  });
});

describe('removeTrailingZeros', () => {
  it('removes trailing zeros after decimal', () => {
    expect(removeTrailingZeros('30000.00')).toBe('30000.0');
  });

  it('keeps significant decimal digits', () => {
    expect(removeTrailingZeros('30000.10')).toBe('30000.1');
  });

  it('preserves at least one decimal digit', () => {
    expect(removeTrailingZeros('100.0')).toBe('100.0');
  });

  it('handles no decimal point', () => {
    expect(removeTrailingZeros('30000')).toBe('30000');
  });

  it('handles value with significant decimals', () => {
    expect(removeTrailingZeros('0.001')).toBe('0.001');
  });

  it('handles multiple trailing zeros', () => {
    expect(removeTrailingZeros('1.23000')).toBe('1.23');
  });
});

describe('floatToIntForHashing', () => {
  it('converts with default 8 decimals', () => {
    expect(floatToIntForHashing(1.5)).toBe(150000000);
  });

  it('converts with custom decimals', () => {
    expect(floatToIntForHashing(1.5, 2)).toBe(150);
  });

  it('rounds correctly', () => {
    expect(floatToIntForHashing(0.123456789, 4)).toBe(1235);
  });

  it('handles string input', () => {
    expect(floatToIntForHashing('100', 2)).toBe(10000);
  });

  it('handles zero', () => {
    expect(floatToIntForHashing(0)).toBe(0);
  });
});

describe('floatToUsdInt', () => {
  it('converts USD to 6-decimal integer', () => {
    expect(floatToUsdInt(100)).toBe(100000000);
  });

  it('handles fractional amounts', () => {
    expect(floatToUsdInt(1.5)).toBe(1500000);
  });

  it('handles string input', () => {
    expect(floatToUsdInt('50.25')).toBe(50250000);
  });

  it('handles zero', () => {
    expect(floatToUsdInt(0)).toBe(0);
  });
});

describe('floatToWire', () => {
  it('converts number to wire format', () => {
    expect(floatToWire(30000)).toBe('30000.0');
  });

  it('converts decimal number', () => {
    expect(floatToWire(3.14)).toBe('3.14');
  });

  it('handles string input', () => {
    expect(floatToWire('100.50')).toBe('100.5');
  });

  it('throws on invalid input', () => {
    expect(() => floatToWire('not-a-number')).toThrow('Invalid number');
  });

  it('formats with up to 8 decimal places', () => {
    expect(floatToWire(1.123456789)).toBe('1.12345679');
  });
});

describe('nowMs', () => {
  it('returns a number', () => {
    expect(typeof nowMs()).toBe('number');
  });

  it('returns current time approximately', () => {
    const before = Date.now();
    const result = nowMs();
    const after = Date.now();
    expect(result).toBeGreaterThanOrEqual(before);
    expect(result).toBeLessThanOrEqual(after);
  });
});

describe('formatTimestamp', () => {
  it('formats milliseconds to ISO string', () => {
    const result = formatTimestamp(1700000000000);
    expect(result).toBe('2023-11-14T22:13:20.000Z');
  });

  it('returns valid ISO string format', () => {
    const result = formatTimestamp(Date.now());
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});
