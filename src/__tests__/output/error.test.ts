import { ActionableError, handleError, requireConfig } from '../../output/error';

describe('ActionableError', () => {
  it('has message and suggestedCommand', () => {
    const err = new ActionableError('Private key missing', 'hyperliquid-cli config init');
    expect(err.message).toBe('Private key missing');
    expect(err.suggestedCommand).toBe('hyperliquid-cli config init');
    expect(err.name).toBe('ActionableError');
  });

  it('works without suggestedCommand', () => {
    const err = new ActionableError('Something went wrong');
    expect(err.message).toBe('Something went wrong');
    expect(err.suggestedCommand).toBeUndefined();
  });

  it('is an instance of Error', () => {
    const err = new ActionableError('test');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('handleError', () => {
  let errorSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation();
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('handles ActionableError with suggestion', () => {
    handleError(new ActionableError('Config missing', 'hyperliquid-cli config init'));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Config missing'));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('hyperliquid-cli config init'));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('handles ActionableError without suggestion', () => {
    handleError(new ActionableError('Just an error'));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Just an error'));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('handles regular Error', () => {
    handleError(new Error('Regular error'));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Regular error'));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('truncates long error messages to 500 chars', () => {
    const longMessage = 'x'.repeat(600);
    handleError(new Error(longMessage));
    const output = errorSpy.mock.calls.map((c: unknown[]) => c[0]).join('');
    expect(output).toContain('...');
    expect(output.length).toBeLessThan(600);
  });

  it('suggests config init for auth-related errors', () => {
    handleError(new Error('Unauthorized access'));
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('hyperliquid-cli config init'),
    );
  });

  it('suggests config init for forbidden errors', () => {
    handleError(new Error('Forbidden'));
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('hyperliquid-cli config init'),
    );
  });

  it('handles unknown error types', () => {
    handleError('string error');
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown error'), 'string error');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('handles null error', () => {
    handleError(null);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});

describe('requireConfig', () => {
  it('passes through when value is defined', () => {
    expect(() => requireConfig('some-value', 'Private key', '--private-key <key>')).not.toThrow();
  });

  it('throws ActionableError when value is undefined', () => {
    expect(() => requireConfig(undefined, 'Private key', '--private-key <key>')).toThrow(
      ActionableError,
    );
  });

  it('includes field name in error message', () => {
    try {
      requireConfig(undefined, 'Private key', '--private-key <key>');
    } catch (err) {
      expect((err as ActionableError).message).toContain('Private key');
    }
  });

  it('includes set command in suggestion', () => {
    try {
      requireConfig(undefined, 'Environment', '--env <env>');
    } catch (err) {
      expect((err as ActionableError).suggestedCommand).toContain('--env <env>');
    }
  });
});
