import { HyperliquidClient } from '../../client/api-client';
import { TEST_PRIVATE_KEY, TEST_ADDRESS, createMockFetch, MOCK_META, MOCK_ALL_MIDS, MOCK_ORDERBOOK } from '../fixtures';

jest.mock('../../setup/auto-setup', () => ({
  ensureSetup: jest.fn().mockResolvedValue(undefined),
}));

describe('HyperliquidClient', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('constructor', () => {
    it('creates client with mainnet env', () => {
      const client = new HyperliquidClient('mainnet');
      expect(client.getEnv()).toBe('mainnet');
    });

    it('creates client with testnet env', () => {
      const client = new HyperliquidClient('testnet');
      expect(client.getEnv()).toBe('testnet');
    });

    it('derives wallet address from private key', () => {
      const client = new HyperliquidClient('mainnet', TEST_PRIVATE_KEY);
      expect(client.getAddress()).toBe(TEST_ADDRESS);
    });

    it('uses provided wallet address over derived', () => {
      const customAddr = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
      const client = new HyperliquidClient('mainnet', TEST_PRIVATE_KEY, customAddr);
      expect(client.getAddress()).toBe(customAddr);
    });

    it('returns undefined address when no key provided', () => {
      const client = new HyperliquidClient('mainnet');
      expect(client.getAddress()).toBeUndefined();
    });

    it('throws on invalid environment', () => {
      expect(() => new HyperliquidClient('invalid' as any)).toThrow('Invalid environment');
    });
  });

  describe('info methods', () => {
    it('getAllMids sends correct request', async () => {
      const mockFetch = createMockFetch(MOCK_ALL_MIDS);
      global.fetch = mockFetch;

      const client = new HyperliquidClient('mainnet');
      const result = await client.getAllMids();

      expect(result).toEqual(MOCK_ALL_MIDS);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.hyperliquid.xyz/info',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ type: 'allMids' }),
        }),
      );
    });

    it('getMeta sends request without dex', async () => {
      global.fetch = createMockFetch(MOCK_META);
      const client = new HyperliquidClient('mainnet');
      await client.getMeta();

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body).toEqual({ type: 'meta' });
    });

    it('getMeta sends request with dex', async () => {
      global.fetch = createMockFetch(MOCK_META);
      const client = new HyperliquidClient('mainnet');
      await client.getMeta('xyz');

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body).toEqual({ type: 'meta', dex: 'xyz' });
    });

    it('getL2Book includes optional parameters', async () => {
      global.fetch = createMockFetch(MOCK_ORDERBOOK);
      const client = new HyperliquidClient('mainnet');
      await client.getL2Book('BTC', 3, undefined, 'xyz');

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body).toEqual({ type: 'l2Book', coin: 'BTC', nSigFigs: 3, dex: 'xyz' });
    });

    it('getL2Book omits undefined optional params', async () => {
      global.fetch = createMockFetch(MOCK_ORDERBOOK);
      const client = new HyperliquidClient('mainnet');
      await client.getL2Book('ETH');

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body).toEqual({ type: 'l2Book', coin: 'ETH' });
    });

    it('getCandleSnapshot includes dex parameter', async () => {
      global.fetch = createMockFetch([]);
      const client = new HyperliquidClient('mainnet');
      await client.getCandleSnapshot('xyz:CL', '1h', 1000, 2000, 'xyz');

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.dex).toBe('xyz');
      expect(body.req.coin).toBe('xyz:CL');
    });

    it('getFundingHistory includes dex parameter', async () => {
      global.fetch = createMockFetch([]);
      const client = new HyperliquidClient('mainnet');
      await client.getFundingHistory('xyz:CL', 1000, 2000, 'xyz');

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.dex).toBe('xyz');
      expect(body.coin).toBe('xyz:CL');
    });

    it('getRecentTrades includes dex parameter', async () => {
      global.fetch = createMockFetch([]);
      const client = new HyperliquidClient('mainnet');
      await client.getRecentTrades('xyz:CL', 'xyz');

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body).toEqual({ type: 'recentTrades', coin: 'xyz:CL', dex: 'xyz' });
    });

    it('uses testnet URL for testnet env', async () => {
      global.fetch = createMockFetch({});
      const client = new HyperliquidClient('testnet');
      await client.getAllMids();

      expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(
        'https://api.hyperliquid-testnet.xyz/info',
      );
    });
  });

  describe('user info methods', () => {
    it('getOpenOrders uses wallet address', async () => {
      global.fetch = createMockFetch([]);
      const client = new HyperliquidClient('mainnet', TEST_PRIVATE_KEY);
      await client.getOpenOrders();

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.user).toBe(TEST_ADDRESS);
    });

    it('getOpenOrders accepts custom user', async () => {
      global.fetch = createMockFetch([]);
      const client = new HyperliquidClient('mainnet', TEST_PRIVATE_KEY);
      const customUser = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
      await client.getOpenOrders(customUser);

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.user).toBe(customUser);
    });

    it('throws when wallet address is not available', async () => {
      const client = new HyperliquidClient('mainnet');
      await expect(client.getOpenOrders()).rejects.toThrow('Wallet address required');
    });
  });

  describe('exchange methods', () => {
    it('throws when private key is not available', async () => {
      const client = new HyperliquidClient('mainnet');
      await expect(
        client.placeOrder([{ asset: 0, isBuy: true, price: 30000, size: 0.1, orderType: { limit: { tif: 'Gtc' } } }]),
      ).rejects.toThrow('Private key required');
    });

    it('placeOrder sends correct action structure', async () => {
      global.fetch = createMockFetch({ status: 'ok' });
      const client = new HyperliquidClient('mainnet', TEST_PRIVATE_KEY);

      await client.placeOrder([{
        asset: 0,
        isBuy: true,
        price: 30000,
        size: 0.1,
        orderType: { limit: { tif: 'Gtc' } },
      }]);

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.action.type).toBe('order');
      expect(body.action.orders).toHaveLength(1);
      expect(body.action.orders[0].a).toBe(0);
      expect(body.action.orders[0].b).toBe(true);
      expect(body.action.builder).toBeDefined();
      expect(body.signature).toBeDefined();
      expect(body.nonce).toBeDefined();
    });

    it('cancelOrder sends correct action', async () => {
      global.fetch = createMockFetch({ status: 'ok' });
      const client = new HyperliquidClient('mainnet', TEST_PRIVATE_KEY);

      await client.cancelOrder([{ asset: 0, oid: 12345 }]);

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.action.type).toBe('cancel');
      expect(body.action.cancels[0]).toEqual({ a: 0, o: 12345 });
    });

    it('updateLeverage sends correct action', async () => {
      global.fetch = createMockFetch({ status: 'ok' });
      const client = new HyperliquidClient('mainnet', TEST_PRIVATE_KEY);

      await client.updateLeverage(0, true, 10);

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.action).toEqual({
        type: 'updateLeverage',
        asset: 0,
        isCross: true,
        leverage: 10,
      });
    });
  });

  describe('error handling', () => {
    it('throws on non-ok response from info endpoint', async () => {
      global.fetch = createMockFetch({ error: 'Bad request' }, 400);
      const client = new HyperliquidClient('mainnet');
      await expect(client.getAllMids()).rejects.toThrow('Info API error (400)');
    });

    it('throws on non-ok response from exchange endpoint', async () => {
      global.fetch = createMockFetch({ error: 'Unauthorized' }, 401);
      const client = new HyperliquidClient('mainnet', TEST_PRIVATE_KEY);
      await expect(
        client.cancelOrder([{ asset: 0, oid: 1 }]),
      ).rejects.toThrow('Exchange API error (401)');
    });

    it('handles network errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      const client = new HyperliquidClient('mainnet');
      await expect(client.getAllMids()).rejects.toThrow('Network error');
    });
  });

  describe('user signed actions', () => {
    it('usdSend throws without private key', async () => {
      const client = new HyperliquidClient('mainnet');
      await expect(client.usdSend('0x123', '100')).rejects.toThrow('Private key required');
    });

    it('usdSend sends correct action', async () => {
      global.fetch = createMockFetch({ status: 'ok' });
      const client = new HyperliquidClient('mainnet', TEST_PRIVATE_KEY);
      await client.usdSend('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', '100');

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.action.type).toBe('usdSend');
      expect(body.action.destination).toBe('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
      expect(body.action.amount).toBe('100');
    });

    it('withdraw sends correct action type', async () => {
      global.fetch = createMockFetch({ status: 'ok' });
      const client = new HyperliquidClient('mainnet', TEST_PRIVATE_KEY);
      await client.withdraw('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', '50');

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.action.type).toBe('withdraw3');
    });
  });
});
