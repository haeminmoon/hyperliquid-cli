import { ActionableError } from '../../output/error';

// Mock the config module before importing helpers
jest.mock('../../config/store', () => ({
  getEffectiveConfig: jest.fn(),
}));

import { createPublicClient, createAuthClient, getWalletAddress } from '../../commands/_helpers';
import { getEffectiveConfig } from '../../config/store';
import { TEST_PRIVATE_KEY, TEST_ADDRESS } from '../fixtures';

const mockedGetConfig = getEffectiveConfig as jest.MockedFunction<typeof getEffectiveConfig>;

describe('createPublicClient', () => {
  it('creates client with mainnet env', () => {
    mockedGetConfig.mockReturnValue({ env: 'mainnet' });
    const client = createPublicClient();
    expect(client.getEnv()).toBe('mainnet');
    expect(client.getAddress()).toBeUndefined();
  });

  it('creates client with testnet env', () => {
    mockedGetConfig.mockReturnValue({ env: 'testnet' });
    const client = createPublicClient();
    expect(client.getEnv()).toBe('testnet');
  });
});

describe('createAuthClient', () => {
  it('creates authenticated client when private key exists', () => {
    mockedGetConfig.mockReturnValue({
      env: 'mainnet',
      privateKey: TEST_PRIVATE_KEY,
      walletAddress: TEST_ADDRESS,
    });
    const client = createAuthClient();
    expect(client.getAddress()).toBe(TEST_ADDRESS);
  });

  it('throws ActionableError when private key is missing', () => {
    mockedGetConfig.mockReturnValue({ env: 'mainnet' });
    expect(() => createAuthClient()).toThrow(ActionableError);
  });

  it('error suggests config init', () => {
    mockedGetConfig.mockReturnValue({ env: 'mainnet' });
    try {
      createAuthClient();
    } catch (err) {
      expect((err as ActionableError).suggestedCommand).toBe('hyperliquid-cli config init');
    }
  });
});

describe('getWalletAddress', () => {
  it('returns wallet address from config', () => {
    mockedGetConfig.mockReturnValue({
      env: 'mainnet',
      walletAddress: TEST_ADDRESS,
    });
    expect(getWalletAddress()).toBe(TEST_ADDRESS);
  });

  it('derives address from private key when walletAddress missing', () => {
    mockedGetConfig.mockReturnValue({
      env: 'mainnet',
      privateKey: TEST_PRIVATE_KEY,
    });
    expect(getWalletAddress()).toBe(TEST_ADDRESS);
  });

  it('throws ActionableError when neither address nor key available', () => {
    mockedGetConfig.mockReturnValue({ env: 'mainnet' });
    expect(() => getWalletAddress()).toThrow(ActionableError);
  });

  it('error suggests config init', () => {
    mockedGetConfig.mockReturnValue({ env: 'mainnet' });
    try {
      getWalletAddress();
    } catch (err) {
      expect((err as ActionableError).suggestedCommand).toBe('hyperliquid-cli config init');
    }
  });
});
