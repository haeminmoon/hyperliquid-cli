import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createPublicClient, createAuthClient, mcpText, withErrorHandling } from '../helpers';
import { resolveAssetIndex } from '../../utils/asset';

export function registerPositionTools(server: McpServer): void {
  server.registerTool(
    'list_positions',
    {
      description: 'List all open perpetual positions with PnL, leverage, and liquidation price',
    },
    async () =>
      withErrorHandling(async () => {
        const auth = createAuthClient();
        if ('error' in auth) return auth.error;
        const data = await auth.client.getClearinghouseState();
        return mcpText(JSON.stringify(data, null, 2));
      }),
  );

  server.registerTool(
    'update_leverage',
    {
      description: 'Update leverage for a perpetual asset',
      inputSchema: {
        coin: z.string().describe('Coin name (e.g., BTC, ETH)'),
        leverage: z.number().min(1).describe('Leverage value'),
        isolated: z.boolean().optional().describe('Use isolated margin (default: cross)'),
      },
    },
    async ({ coin, leverage, isolated }) =>
      withErrorHandling(async () => {
        const auth = createAuthClient();
        if ('error' in auth) return auth.error;

        const pubClient = createPublicClient();
        const asset = await resolveAssetIndex(coin, pubClient);

        const result = await auth.client.updateLeverage(asset, !isolated, leverage);
        return mcpText(JSON.stringify(result, null, 2));
      }),
  );
}
