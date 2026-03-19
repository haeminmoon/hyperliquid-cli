import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createAuthClient, mcpText, withErrorHandling } from '../helpers';

export function registerTransferTools(server: McpServer): void {
  server.registerTool(
    'usd_send',
    {
      description: 'Send USDC to another address on Hyperliquid',
      inputSchema: {
        destination: z.string().describe('Destination address'),
        amount: z.string().describe('Amount of USDC'),
      },
    },
    async ({ destination, amount }) =>
      withErrorHandling(async () => {
        const auth = createAuthClient();
        if ('error' in auth) return auth.error;
        const result = await auth.client.usdSend(destination, amount);
        return mcpText(JSON.stringify(result, null, 2));
      }),
  );

  server.registerTool(
    'spot_send',
    {
      description: 'Send a spot token to another address',
      inputSchema: {
        destination: z.string().describe('Destination address'),
        token: z.string().describe('Token identifier (e.g., PURR:0x...)'),
        amount: z.string().describe('Amount to send'),
      },
    },
    async ({ destination, token, amount }) =>
      withErrorHandling(async () => {
        const auth = createAuthClient();
        if ('error' in auth) return auth.error;
        const result = await auth.client.spotSend(destination, token, amount);
        return mcpText(JSON.stringify(result, null, 2));
      }),
  );

  server.registerTool(
    'withdraw',
    {
      description: 'Withdraw USDC to Arbitrum (~5 min finalization, $1 fee)',
      inputSchema: {
        destination: z.string().describe('Destination address on Arbitrum'),
        amount: z.string().describe('Amount of USDC'),
      },
    },
    async ({ destination, amount }) =>
      withErrorHandling(async () => {
        const auth = createAuthClient();
        if ('error' in auth) return auth.error;
        const result = await auth.client.withdraw(destination, amount);
        return mcpText(JSON.stringify(result, null, 2));
      }),
  );

  server.registerTool(
    'usd_class_transfer',
    {
      description: 'Transfer USDC between spot and perpetuals accounts',
      inputSchema: {
        amount: z.string().describe('Amount to transfer'),
        to_perp: z.boolean().describe('true = spot->perp, false = perp->spot'),
      },
    },
    async ({ amount, to_perp }) =>
      withErrorHandling(async () => {
        const auth = createAuthClient();
        if ('error' in auth) return auth.error;
        const result = await auth.client.usdClassTransfer(amount, to_perp);
        return mcpText(JSON.stringify(result, null, 2));
      }),
  );
}
