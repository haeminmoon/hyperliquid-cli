import {
  BASE_URLS,
  WS_URLS,
  ENV_ALIASES,
  L1_DOMAIN,
  USER_SIGNED_ACTION_DOMAIN_MAINNET,
  USER_SIGNED_ACTION_DOMAIN_TESTNET,
  getUserSignedActionDomain,
  SIGNATURE_CHAIN_ID,
  CANDLE_INTERVALS,
  INTERVAL_MS,
  BUILDER_ADDRESS,
} from '../../config/constants';

describe('BASE_URLS', () => {
  it('has mainnet URL', () => {
    expect(BASE_URLS.mainnet).toBe('https://api.hyperliquid.xyz');
  });

  it('has testnet URL', () => {
    expect(BASE_URLS.testnet).toBe('https://api.hyperliquid-testnet.xyz');
  });

  it('both URLs use HTTPS', () => {
    expect(BASE_URLS.mainnet).toMatch(/^https:\/\//);
    expect(BASE_URLS.testnet).toMatch(/^https:\/\//);
  });
});

describe('WS_URLS', () => {
  it('has mainnet WebSocket URL', () => {
    expect(WS_URLS.mainnet).toMatch(/^wss:\/\//);
  });

  it('has testnet WebSocket URL', () => {
    expect(WS_URLS.testnet).toMatch(/^wss:\/\//);
  });
});

describe('ENV_ALIASES', () => {
  it('maps mainnet aliases', () => {
    expect(ENV_ALIASES.mainnet).toBe('mainnet');
    expect(ENV_ALIASES.main).toBe('mainnet');
    expect(ENV_ALIASES.prod).toBe('mainnet');
    expect(ENV_ALIASES.production).toBe('mainnet');
  });

  it('maps testnet aliases', () => {
    expect(ENV_ALIASES.testnet).toBe('testnet');
    expect(ENV_ALIASES.test).toBe('testnet');
  });
});

describe('EIP-712 Domains', () => {
  it('L1 domain has correct chainId', () => {
    expect(L1_DOMAIN.chainId).toBe(1337);
    expect(L1_DOMAIN.name).toBe('Exchange');
  });

  it('mainnet user domain has Arbitrum One chainId', () => {
    expect(USER_SIGNED_ACTION_DOMAIN_MAINNET.chainId).toBe(42161);
    expect(USER_SIGNED_ACTION_DOMAIN_MAINNET.name).toBe('HyperliquidSignTransaction');
  });

  it('testnet user domain has Arbitrum Sepolia chainId', () => {
    expect(USER_SIGNED_ACTION_DOMAIN_TESTNET.chainId).toBe(421614);
  });

  it('getUserSignedActionDomain returns correct domain', () => {
    expect(getUserSignedActionDomain('mainnet')).toBe(USER_SIGNED_ACTION_DOMAIN_MAINNET);
    expect(getUserSignedActionDomain('testnet')).toBe(USER_SIGNED_ACTION_DOMAIN_TESTNET);
  });
});

describe('SIGNATURE_CHAIN_ID', () => {
  it('has hex values for both environments', () => {
    expect(SIGNATURE_CHAIN_ID.mainnet).toBe('0xa4b1');
    expect(SIGNATURE_CHAIN_ID.testnet).toBe('0x66eee');
  });
});

describe('CANDLE_INTERVALS and INTERVAL_MS', () => {
  it('every candle interval has a corresponding ms value', () => {
    for (const interval of CANDLE_INTERVALS) {
      expect(INTERVAL_MS[interval]).toBeDefined();
      expect(typeof INTERVAL_MS[interval]).toBe('number');
    }
  });

  it('intervals are in ascending order of ms', () => {
    const values = CANDLE_INTERVALS.map((i) => INTERVAL_MS[i]);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });

  it('1h equals 3600000ms', () => {
    expect(INTERVAL_MS['1h']).toBe(3600000);
  });

  it('1d equals 86400000ms', () => {
    expect(INTERVAL_MS['1d']).toBe(86400000);
  });
});

describe('BUILDER_ADDRESS', () => {
  it('is a valid lowercase hex address', () => {
    expect(BUILDER_ADDRESS).toMatch(/^0x[0-9a-f]{40}$/);
  });
});
