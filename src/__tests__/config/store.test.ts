import * as fs from 'fs';
import { loadConfig, saveConfig, getEffectiveConfig, maskSecret } from '../../config/store';

jest.mock('fs');

const mockedFs = fs as jest.Mocked<typeof fs>;

describe('loadConfig', () => {
  afterEach(() => jest.resetAllMocks());

  it('returns default config when file does not exist', () => {
    mockedFs.readFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    const config = loadConfig();
    expect(config.env).toBe('mainnet');
    expect(config.privateKey).toBeUndefined();
  });

  it('returns parsed config when file exists', () => {
    mockedFs.readFileSync.mockReturnValue(
      JSON.stringify({ env: 'testnet', privateKey: '0xabc' }),
    );
    const config = loadConfig();
    expect(config.env).toBe('testnet');
    expect(config.privateKey).toBe('0xabc');
  });

  it('returns default config on invalid JSON', () => {
    mockedFs.readFileSync.mockReturnValue('not-json{{{');
    const config = loadConfig();
    expect(config.env).toBe('mainnet');
  });

  it('merges with defaults (env fallback)', () => {
    mockedFs.readFileSync.mockReturnValue(
      JSON.stringify({ privateKey: '0x123' }),
    );
    const config = loadConfig();
    expect(config.env).toBe('mainnet');
    expect(config.privateKey).toBe('0x123');
  });
});

describe('saveConfig', () => {
  afterEach(() => jest.resetAllMocks());

  it('writes config with 0o600 permissions', () => {
    mockedFs.readFileSync.mockReturnValue(JSON.stringify({ env: 'mainnet' }));
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.writeFileSync.mockImplementation(() => {});
    mockedFs.mkdirSync.mockImplementation(() => undefined as any);

    saveConfig({ privateKey: '0xnewkey' });

    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('config.json'),
      expect.any(String),
      { mode: 0o600 },
    );
  });

  it('merges with existing config', () => {
    mockedFs.readFileSync.mockReturnValue(
      JSON.stringify({ env: 'testnet', privateKey: '0xold' }),
    );
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.writeFileSync.mockImplementation(() => {});

    saveConfig({ privateKey: '0xnew' });

    const writtenJson = (mockedFs.writeFileSync as jest.Mock).mock.calls[0][1];
    const parsed = JSON.parse(writtenJson);
    expect(parsed.env).toBe('testnet');
    expect(parsed.privateKey).toBe('0xnew');
  });

  it('creates config directory if missing', () => {
    mockedFs.readFileSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    mockedFs.existsSync.mockReturnValue(false);
    mockedFs.mkdirSync.mockImplementation(() => undefined as any);
    mockedFs.writeFileSync.mockImplementation(() => {});

    saveConfig({ env: 'mainnet' });

    expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('.hyperliquid-cli'),
      { mode: 0o700, recursive: true },
    );
  });
});

describe('getEffectiveConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.resetAllMocks();
  });

  it('uses disk config by default', () => {
    mockedFs.readFileSync.mockReturnValue(
      JSON.stringify({ env: 'testnet', privateKey: '0xdisk' }),
    );
    const config = getEffectiveConfig();
    expect(config.env).toBe('testnet');
    expect(config.privateKey).toBe('0xdisk');
  });

  it('overrides privateKey with HYPERLIQUID_WALLET_PRIVATE_KEY env var', () => {
    mockedFs.readFileSync.mockReturnValue(JSON.stringify({ env: 'mainnet' }));
    process.env.HYPERLIQUID_WALLET_PRIVATE_KEY = '0xenvkey';
    const config = getEffectiveConfig();
    expect(config.privateKey).toBe('0xenvkey');
  });

  it('overrides walletAddress with HYPERLIQUID_WALLET_ADDRESS env var', () => {
    mockedFs.readFileSync.mockReturnValue(JSON.stringify({ env: 'mainnet' }));
    process.env.HYPERLIQUID_WALLET_ADDRESS = '0xenvaddr';
    const config = getEffectiveConfig();
    expect(config.walletAddress).toBe('0xenvaddr');
  });

  it('overrides env with HYPERLIQUID_ENV=testnet', () => {
    mockedFs.readFileSync.mockReturnValue(JSON.stringify({ env: 'mainnet' }));
    process.env.HYPERLIQUID_ENV = 'testnet';
    const config = getEffectiveConfig();
    expect(config.env).toBe('testnet');
  });

  it('ignores invalid HYPERLIQUID_ENV value', () => {
    mockedFs.readFileSync.mockReturnValue(JSON.stringify({ env: 'mainnet' }));
    process.env.HYPERLIQUID_ENV = 'invalid';
    const config = getEffectiveConfig();
    expect(config.env).toBe('mainnet');
  });

  it('disk config takes priority over env var when present', () => {
    mockedFs.readFileSync.mockReturnValue(
      JSON.stringify({ env: 'mainnet', privateKey: '0xdisk' }),
    );
    process.env.HYPERLIQUID_WALLET_PRIVATE_KEY = '0xenv';
    const config = getEffectiveConfig();
    expect(config.privateKey).toBe('0xdisk');
  });
});

describe('maskSecret', () => {
  it('returns "(not set)" for undefined', () => {
    expect(maskSecret(undefined)).toBe('(not set)');
  });

  it('returns "(not set)" for empty string', () => {
    expect(maskSecret('')).toBe('(not set)');
  });

  it('returns "****" for short values', () => {
    expect(maskSecret('1234567890')).toBe('****');
  });

  it('masks long values showing first 6 and last 4', () => {
    expect(maskSecret('0x1234567890abcdef')).toBe('0x1234...cdef');
  });

  it('masks private key format', () => {
    const key = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
    const masked = maskSecret(key);
    expect(masked).toBe('0xac09...ff80');
    expect(masked).not.toContain('bec39a');
  });
});
