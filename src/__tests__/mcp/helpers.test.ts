jest.mock('../../config/store', () => ({
  getEffectiveConfig: jest.fn(),
}));

import { mcpText, mcpError, createPublicClient, createAuthClient, withErrorHandling } from '../../mcp/helpers';
import { getEffectiveConfig } from '../../config/store';
import { TEST_PRIVATE_KEY, TEST_ADDRESS } from '../fixtures';

const mockedGetConfig = getEffectiveConfig as jest.MockedFunction<typeof getEffectiveConfig>;

describe('mcpText', () => {
  it('returns correct MCP response format', () => {
    const result = mcpText('hello');
    expect(result).toEqual({
      content: [{ type: 'text', text: 'hello' }],
    });
  });

  it('handles empty string', () => {
    const result = mcpText('');
    expect(result).toEqual({
      content: [{ type: 'text', text: '' }],
    });
  });
});

describe('mcpError', () => {
  it('returns error format with prefix', () => {
    const result = mcpError('Something failed');
    expect(result).toEqual({
      content: [{ type: 'text', text: 'ERROR: Something failed' }],
      isError: true,
    });
  });
});

describe('createPublicClient (MCP)', () => {
  it('creates client from config', () => {
    mockedGetConfig.mockReturnValue({ env: 'mainnet' });
    const client = createPublicClient();
    expect(client.getEnv()).toBe('mainnet');
  });
});

describe('createAuthClient (MCP)', () => {
  it('returns client when private key exists', () => {
    mockedGetConfig.mockReturnValue({
      env: 'mainnet',
      privateKey: TEST_PRIVATE_KEY,
      walletAddress: TEST_ADDRESS,
    });
    const result = createAuthClient();
    expect('client' in result).toBe(true);
  });

  it('returns error when private key missing', () => {
    mockedGetConfig.mockReturnValue({ env: 'mainnet' });
    const result = createAuthClient();
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error.isError).toBe(true);
    }
  });
});

describe('withErrorHandling', () => {
  it('returns result on success', async () => {
    const result = await withErrorHandling(async () => mcpText('ok'));
    expect(result).toEqual(mcpText('ok'));
  });

  it('returns error on exception', async () => {
    const result = await withErrorHandling(async () => {
      throw new Error('Test error');
    });
    expect(result).toEqual(mcpError('Test error'));
  });

  it('truncates long error messages to 500 chars', async () => {
    const longMsg = 'x'.repeat(600);
    const result = await withErrorHandling(async () => {
      throw new Error(longMsg);
    });
    if ('content' in result) {
      expect(result.content[0].text.length).toBeLessThanOrEqual(507); // "ERROR: " + 500 chars
    }
  });

  it('handles non-Error thrown values', async () => {
    const result = await withErrorHandling(async () => {
      throw 'string error';
    });
    expect(result).toEqual(mcpError('string error'));
  });
});
