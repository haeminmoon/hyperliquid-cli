import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createPublicClient, createAuthClient, mcpText, withErrorHandling } from '../helpers';
import { resolveAssetIndex } from '../../utils/asset';
import { OrderType } from '../../client/api-client';

export function registerOrderTools(server: McpServer): void {
  server.registerTool(
    'place_order',
    {
      description: 'Place an order on Hyperliquid (limit, market, stop-loss, take-profit)',
      inputSchema: z.object({
        coin: z.string().describe('Coin name (e.g., BTC, ETH)'),
        side: z.enum(['buy', 'sell']).describe('Order side'),
        size: z.string().describe('Order size'),
        price: z.string().describe('Order price'),
        tif: z.enum(['Gtc', 'Alo', 'Ioc']).optional().describe('Time in force (default: Gtc)'),
        reduce_only: z.boolean().optional().describe('Reduce only order'),
        trigger_px: z.string().optional().describe('Trigger price for stop/TP orders'),
        tpsl: z.enum(['tp', 'sl']).optional().describe('TP or SL (when using trigger)'),
        cloid: z.string().optional().describe('Client order ID (128-bit hex)'),
      }),
    },
    async (params) =>
      withErrorHandling(async () => {
        const auth = createAuthClient();
        if ('error' in auth) return auth.error;

        const pubClient = createPublicClient();
        const asset = await resolveAssetIndex(params.coin, pubClient);
        const orderType: OrderType = params.trigger_px
          ? {
              trigger: {
                triggerPx: params.trigger_px,
                isMarket: true,
                tpsl: params.tpsl ?? 'sl',
              },
            }
          : { limit: { tif: params.tif ?? 'Gtc' } };

        const result = await auth.client.placeOrder([
          {
            asset,
            isBuy: params.side === 'buy',
            price: params.price,
            size: params.size,
            reduceOnly: params.reduce_only,
            orderType,
          },
        ]);
        return mcpText(JSON.stringify(result, null, 2));
      }),
  );

  server.registerTool(
    'cancel_order',
    {
      description: 'Cancel an order by its order ID',
      inputSchema: z.object({
        coin: z.string().describe('Coin name'),
        oid: z.number().describe('Order ID'),
      }),
    },
    async ({ coin, oid }) =>
      withErrorHandling(async () => {
        const auth = createAuthClient();
        if ('error' in auth) return auth.error;
        const pubClient = createPublicClient();
        const asset = await resolveAssetIndex(coin, pubClient);
        const result = await auth.client.cancelOrder([{ asset, oid }]);
        return mcpText(JSON.stringify(result, null, 2));
      }),
  );

  server.registerTool(
    'list_open_orders',
    {
      description: 'List all open orders',
      inputSchema: z.object({}),
    },
    async () =>
      withErrorHandling(async () => {
        const auth = createAuthClient();
        if ('error' in auth) return auth.error;
        const data = await auth.client.getOpenOrders();
        return mcpText(JSON.stringify(data, null, 2));
      }),
  );

  server.registerTool(
    'get_order_status',
    {
      description: 'Get the status of a specific order',
      inputSchema: z.object({
        oid: z.union([z.number(), z.string()]).describe('Order ID or client order ID'),
      }),
    },
    async ({ oid }) =>
      withErrorHandling(async () => {
        const auth = createAuthClient();
        if ('error' in auth) return auth.error;
        const data = await auth.client.getOrderStatus(oid);
        return mcpText(JSON.stringify(data, null, 2));
      }),
  );

  server.registerTool(
    'get_order_history',
    {
      description: 'List historical orders (max 2000)',
      inputSchema: z.object({}),
    },
    async () =>
      withErrorHandling(async () => {
        const auth = createAuthClient();
        if ('error' in auth) return auth.error;
        const data = await auth.client.getHistoricalOrders();
        return mcpText(JSON.stringify(data, null, 2));
      }),
  );

  server.registerTool(
    'get_user_fills',
    {
      description: 'Get recent trade fills',
      inputSchema: z.object({
        hours: z.number().optional().describe('Hours to look back'),
      }),
    },
    async ({ hours }) =>
      withErrorHandling(async () => {
        const auth = createAuthClient();
        if ('error' in auth) return auth.error;
        let data;
        if (hours) {
          const startTime = Date.now() - hours * 3600000;
          data = await auth.client.getUserFillsByTime(startTime);
        } else {
          data = await auth.client.getUserFills();
        }
        return mcpText(JSON.stringify(data, null, 2));
      }),
  );
}
