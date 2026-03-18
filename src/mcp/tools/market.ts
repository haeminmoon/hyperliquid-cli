import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createPublicClient, mcpText, withErrorHandling } from '../helpers';
import { INTERVAL_MS, CandleInterval, CANDLE_INTERVALS } from '../../config/constants';
import { parseCoinDex } from '../../utils/asset';

export function registerMarketTools(server: McpServer): void {
  server.tool(
    'get_all_mids',
    'Get all mid prices for perpetual and spot assets on Hyperliquid',
    {},
    async () =>
      withErrorHandling(async () => {
        const client = createPublicClient();
        const data = await client.getAllMids();
        return mcpText(JSON.stringify(data, null, 2));
      }),
  );

  server.tool(
    'get_meta',
    'Get perpetual market metadata (instruments, max leverage, decimals). Use dex param for HIP-3 builder-deployed perps (e.g., "xyz")',
    {
      spot: z.boolean().optional().describe('Get spot metadata instead'),
      dex: z.string().optional().describe('HIP-3 dex name (e.g., xyz) for builder-deployed perps'),
    },
    async ({ spot, dex }) =>
      withErrorHandling(async () => {
        const client = createPublicClient();
        const data = spot
          ? await client.getSpotMeta()
          : await client.getMeta(dex);
        return mcpText(JSON.stringify(data, null, 2));
      }),
  );

  server.tool(
    'get_ticker',
    'Get ticker data for a specific coin including price, volume, funding. Use dex:coin format for HIP-3 (e.g., xyz:CL)',
    {
      coin: z.string().describe('Coin name (e.g., BTC, ETH, xyz:CL for HIP-3)'),
      spot: z.boolean().optional().describe('Get spot ticker'),
    },
    async ({ coin, spot }) =>
      withErrorHandling(async () => {
        const client = createPublicClient();
        const { dex } = parseCoinDex(coin);
        const data = spot
          ? await client.getSpotMetaAndAssetCtxs()
          : await client.getMetaAndAssetCtxs(dex);

        const arr = data as [
          { universe: Array<{ name: string }> },
          Array<Record<string, unknown>>,
        ];
        const idx = arr[0].universe.findIndex(
          (u) => u.name.toUpperCase() === coin.toUpperCase(),
        );
        if (idx === -1) return mcpText(`Coin "${coin}" not found.`);

        return mcpText(
          JSON.stringify({ ...arr[0].universe[idx], ...arr[1][idx] }, null, 2),
        );
      }),
  );

  server.tool(
    'get_orderbook',
    'Get L2 order book for a coin',
    {
      coin: z.string().describe('Coin name (e.g., BTC, ETH, xyz:CL for HIP-3)'),
      depth: z.number().min(2).max(5).optional().describe('Significant figures (2-5)'),
    },
    async ({ coin, depth }) =>
      withErrorHandling(async () => {
        const client = createPublicClient();
        const { dex } = parseCoinDex(coin);
        const data = await client.getL2Book(coin, depth, undefined, dex);
        return mcpText(JSON.stringify(data, null, 2));
      }),
  );

  server.tool(
    'get_candles',
    'Get OHLCV candlestick data for a coin',
    {
      coin: z.string().describe('Coin name (e.g., BTC, ETH, xyz:CL for HIP-3)'),
      interval: z.string().describe('Candle interval (1m, 5m, 15m, 1h, 4h, 1d, etc.)'),
      count: z.number().min(1).max(5000).optional().describe('Number of candles (default 50)'),
    },
    async ({ coin, interval, count }) =>
      withErrorHandling(async () => {
        if (!CANDLE_INTERVALS.includes(interval as CandleInterval)) {
          return mcpText(`Invalid interval "${interval}". Use: ${CANDLE_INTERVALS.join(', ')}`);
        }

        const client = createPublicClient();
        const { dex } = parseCoinDex(coin);
        const n = count ?? 50;
        const endTime = Date.now();
        const startTime = endTime - n * (INTERVAL_MS[interval] ?? 3600000);
        const data = await client.getCandleSnapshot(coin, interval as CandleInterval, startTime, endTime, dex);
        return mcpText(JSON.stringify(data, null, 2));
      }),
  );

  server.tool(
    'get_funding',
    'Get funding rate history or predicted funding rates',
    {
      coin: z.string().describe('Coin name (e.g., BTC, ETH, xyz:CL for HIP-3)'),
      hours: z.number().optional().describe('Hours to look back (default 24)'),
      predicted: z.boolean().optional().describe('Get predicted funding instead'),
    },
    async ({ coin, hours, predicted }) =>
      withErrorHandling(async () => {
        const client = createPublicClient();
        if (predicted) {
          const data = await client.getPredictedFundings();
          return mcpText(JSON.stringify(data, null, 2));
        }
        const { dex } = parseCoinDex(coin);
        const h = hours ?? 24;
        const endTime = Date.now();
        const startTime = endTime - h * 3600000;
        const data = await client.getFundingHistory(coin, startTime, endTime, dex);
        return mcpText(JSON.stringify(data, null, 2));
      }),
  );

  server.tool(
    'get_recent_trades',
    'Get recent trades for a coin',
    { coin: z.string().describe('Coin name (e.g., BTC, ETH, xyz:CL for HIP-3)') },
    async ({ coin }) =>
      withErrorHandling(async () => {
        const client = createPublicClient();
        const { dex } = parseCoinDex(coin);
        const data = await client.getRecentTrades(coin, dex);
        return mcpText(JSON.stringify(data, null, 2));
      }),
  );
}
