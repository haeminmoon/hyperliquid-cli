import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createAuthClient, mcpText, withErrorHandling } from '../helpers';

export function registerAccountTools(server: McpServer): void {
  server.tool(
    'get_account_state',
    'Get perpetual account state (positions, margin summary, balances)',
    {},
    async () =>
      withErrorHandling(async () => {
        const auth = createAuthClient();
        if ('error' in auth) return auth.error;
        const data = await auth.client.getClearinghouseState();
        return mcpText(JSON.stringify(data, null, 2));
      }),
  );

  server.tool(
    'get_spot_balances',
    'Get spot token balances',
    {},
    async () =>
      withErrorHandling(async () => {
        const auth = createAuthClient();
        if ('error' in auth) return auth.error;
        const data = await auth.client.getSpotClearinghouseState();
        return mcpText(JSON.stringify(data, null, 2));
      }),
  );

  server.tool(
    'get_portfolio',
    'Get portfolio summary with PnL history',
    {},
    async () =>
      withErrorHandling(async () => {
        const auth = createAuthClient();
        if ('error' in auth) return auth.error;
        const data = await auth.client.getPortfolio();
        return mcpText(JSON.stringify(data, null, 2));
      }),
  );

  server.tool(
    'get_user_fees',
    'Get fee schedule and current rates',
    {},
    async () =>
      withErrorHandling(async () => {
        const auth = createAuthClient();
        if ('error' in auth) return auth.error;
        const data = await auth.client.getUserFees();
        return mcpText(JSON.stringify(data, null, 2));
      }),
  );

  server.tool(
    'get_rate_limit',
    'Get current rate limit status',
    {},
    async () =>
      withErrorHandling(async () => {
        const auth = createAuthClient();
        if ('error' in auth) return auth.error;
        const data = await auth.client.getUserRateLimit();
        return mcpText(JSON.stringify(data, null, 2));
      }),
  );

  server.tool(
    'get_sub_accounts',
    'List sub-accounts',
    {},
    async () =>
      withErrorHandling(async () => {
        const auth = createAuthClient();
        if ('error' in auth) return auth.error;
        const data = await auth.client.getSubAccounts();
        return mcpText(JSON.stringify(data, null, 2));
      }),
  );
}
