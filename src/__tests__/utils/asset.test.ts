import { parseCoinDex, resolveAssetIndex } from '../../utils/asset';
import { MOCK_META, MOCK_SPOT_META, MOCK_DEX_META, MOCK_PERP_DEXS } from '../fixtures';

describe('parseCoinDex', () => {
  it('parses plain coin without dex prefix', () => {
    const result = parseCoinDex('BTC');
    expect(result).toEqual({ dex: undefined, coin: 'BTC' });
  });

  it('parses coin with dex prefix', () => {
    const result = parseCoinDex('xyz:CL');
    expect(result).toEqual({ dex: 'xyz', coin: 'xyz:CL' });
  });

  it('parses another dex coin', () => {
    const result = parseCoinDex('xyz:TSLA');
    expect(result).toEqual({ dex: 'xyz', coin: 'xyz:TSLA' });
  });

  it('handles coin with no colon', () => {
    const result = parseCoinDex('SOL');
    expect(result).toEqual({ dex: undefined, coin: 'SOL' });
  });

  it('handles arbitrary dex name', () => {
    const result = parseCoinDex('abc:GOLD');
    expect(result).toEqual({ dex: 'abc', coin: 'abc:GOLD' });
  });
});

describe('resolveAssetIndex', () => {
  function createMockClient(overrides: Partial<{
    getMeta: jest.Mock;
    getSpotMeta: jest.Mock;
    getPerpDexs: jest.Mock;
  }> = {}) {
    return {
      getMeta: overrides.getMeta ?? jest.fn().mockResolvedValue(MOCK_META),
      getSpotMeta: overrides.getSpotMeta ?? jest.fn().mockResolvedValue(MOCK_SPOT_META),
      getPerpDexs: overrides.getPerpDexs ?? jest.fn().mockResolvedValue(MOCK_PERP_DEXS),
    } as any;
  }

  it('resolves BTC to index 0', async () => {
    const client = createMockClient();
    const idx = await resolveAssetIndex('BTC', client);
    expect(idx).toBe(0);
  });

  it('resolves ETH to index 1', async () => {
    const client = createMockClient();
    const idx = await resolveAssetIndex('ETH', client);
    expect(idx).toBe(1);
  });

  it('resolves SOL to index 2', async () => {
    const client = createMockClient();
    const idx = await resolveAssetIndex('SOL', client);
    expect(idx).toBe(2);
  });

  it('is case-insensitive for perpetuals', async () => {
    const client = createMockClient();
    const idx = await resolveAssetIndex('btc', client);
    expect(idx).toBe(0);
  });

  it('resolves spot asset with 10000 offset', async () => {
    const client = createMockClient({
      getMeta: jest.fn().mockResolvedValue({ universe: [] }),
    });
    const idx = await resolveAssetIndex('PURR/USDC', client);
    expect(idx).toBe(10000);
  });

  it('resolves second spot asset', async () => {
    const client = createMockClient({
      getMeta: jest.fn().mockResolvedValue({ universe: [] }),
    });
    const idx = await resolveAssetIndex('HYPE/USDC', client);
    expect(idx).toBe(10001);
  });

  it('resolves HIP-3 dex coin with dex offset', async () => {
    const client = createMockClient({
      getMeta: jest.fn().mockResolvedValue(MOCK_DEX_META),
    });
    // xyz is at index 1 in perpDexs, so offset = 110000 + (1-1)*10000 = 110000
    // xyz:CL is at index 1 in xyz meta
    const idx = await resolveAssetIndex('xyz:CL', client);
    expect(idx).toBe(110001);
  });

  it('resolves first dex coin', async () => {
    const client = createMockClient({
      getMeta: jest.fn().mockResolvedValue(MOCK_DEX_META),
    });
    const idx = await resolveAssetIndex('xyz:TSLA', client);
    expect(idx).toBe(110000);
  });

  it('throws for unknown perpetual coin', async () => {
    const client = createMockClient({
      getMeta: jest.fn().mockResolvedValue({ universe: [] }),
      getSpotMeta: jest.fn().mockResolvedValue({ universe: [] }),
    });
    await expect(resolveAssetIndex('UNKNOWN', client)).rejects.toThrow(
      'Asset "UNKNOWN" not found',
    );
  });

  it('throws for unknown dex coin', async () => {
    const client = createMockClient({
      getMeta: jest.fn().mockResolvedValue({ universe: [] }),
    });
    await expect(resolveAssetIndex('xyz:UNKNOWN', client)).rejects.toThrow(
      'Asset "xyz:UNKNOWN" not found',
    );
  });

  it('throws for unknown dex name', async () => {
    const client = createMockClient({
      getMeta: jest.fn().mockResolvedValue({
        universe: [{ name: 'fake:TOKEN' }],
      }),
    });
    await expect(resolveAssetIndex('fake:TOKEN', client)).rejects.toThrow(
      'Perp dex "fake" not found',
    );
  });

  it('calls getMeta with dex parameter for dex coins', async () => {
    const getMeta = jest.fn().mockResolvedValue(MOCK_DEX_META);
    const client = createMockClient({ getMeta });
    await resolveAssetIndex('xyz:CL', client);
    expect(getMeta).toHaveBeenCalledWith('xyz');
  });

  it('does not search spot for dex-prefixed coins', async () => {
    const getSpotMeta = jest.fn();
    const client = createMockClient({
      getMeta: jest.fn().mockResolvedValue({ universe: [] }),
      getSpotMeta,
    });
    await expect(resolveAssetIndex('xyz:NONEXISTENT', client)).rejects.toThrow();
    expect(getSpotMeta).not.toHaveBeenCalled();
  });
});
