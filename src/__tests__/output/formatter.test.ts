import { output, getOutputFormat } from '../../output/formatter';

describe('getOutputFormat', () => {
  it('returns json when output option is json', () => {
    expect(getOutputFormat({ output: 'json' })).toBe('json');
  });

  it('returns table when output option is table', () => {
    expect(getOutputFormat({ output: 'table' })).toBe('table');
  });

  it('returns table when output option is undefined', () => {
    expect(getOutputFormat({})).toBe('table');
  });

  it('returns table for unknown format', () => {
    expect(getOutputFormat({ output: 'csv' })).toBe('table');
  });
});

describe('output', () => {
  let logSpy: jest.SpyInstance;
  let tableSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation();
    tableSpy = jest.spyOn(console, 'table').mockImplementation();
  });

  afterEach(() => {
    logSpy.mockRestore();
    tableSpy.mockRestore();
  });

  describe('json format', () => {
    it('outputs JSON with 2-space indent for object', () => {
      const data = { name: 'BTC', price: 70000 };
      output(data, 'json');
      expect(logSpy).toHaveBeenCalledWith(JSON.stringify(data, null, 2));
    });

    it('outputs JSON for array', () => {
      const data = [1, 2, 3];
      output(data, 'json');
      expect(logSpy).toHaveBeenCalledWith(JSON.stringify(data, null, 2));
    });

    it('outputs JSON for null', () => {
      output(null, 'json');
      expect(logSpy).toHaveBeenCalledWith('null');
    });
  });

  describe('table format', () => {
    it('uses console.table for arrays', () => {
      const data = [{ a: 1 }, { a: 2 }];
      output(data, 'table');
      expect(tableSpy).toHaveBeenCalledWith(data);
    });

    it('shows "No data" for empty arrays', () => {
      output([], 'table');
      expect(logSpy).toHaveBeenCalledWith('No data');
    });

    it('formats objects as key-value pairs', () => {
      output({ name: 'BTC', price: 70000 }, 'table');
      expect(logSpy).toHaveBeenCalledTimes(2);
      expect(logSpy.mock.calls[0][0]).toContain('name');
      expect(logSpy.mock.calls[0][0]).toContain('BTC');
      expect(logSpy.mock.calls[1][0]).toContain('price');
      expect(logSpy.mock.calls[1][0]).toContain('70000');
    });

    it('pads object keys to align values', () => {
      output({ a: 1, longKey: 2 }, 'table');
      const firstCall = logSpy.mock.calls[0][0] as string;
      const secondCall = logSpy.mock.calls[1][0] as string;
      // longKey is longer, so 'a' should be padded
      expect(firstCall.indexOf('1')).toBe(secondCall.indexOf('2'));
    });

    it('stringifies nested objects in table format', () => {
      output({ data: { nested: true } }, 'table');
      expect(logSpy.mock.calls[0][0]).toContain('{"nested":true}');
    });

    it('outputs scalar values directly', () => {
      output('hello', 'table');
      expect(logSpy).toHaveBeenCalledWith('hello');
    });

    it('outputs numbers directly', () => {
      output(42, 'table');
      expect(logSpy).toHaveBeenCalledWith('42');
    });
  });
});
