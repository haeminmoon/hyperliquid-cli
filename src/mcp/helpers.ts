import { HyperliquidClient } from '../client/api-client';
import { getEffectiveConfig } from '../config/store';

export function mcpText(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

export function mcpError(message: string) {
  return {
    content: [{ type: 'text' as const, text: `ERROR: ${message}` }],
    isError: true,
  };
}

export function createPublicClient(): HyperliquidClient {
  const config = getEffectiveConfig();
  return new HyperliquidClient(config.env);
}

export function createAuthClient():
  | { client: HyperliquidClient }
  | { error: ReturnType<typeof mcpError> } {
  const config = getEffectiveConfig();
  if (!config.privateKey) {
    return {
      error: mcpError(
        'Private key not configured. Run: hyperliquid-cli config init',
      ),
    };
  }
  return {
    client: new HyperliquidClient(
      config.env,
      config.privateKey,
      config.walletAddress,
    ),
  };
}

export async function withErrorHandling(
  fn: () => Promise<ReturnType<typeof mcpText>>,
): Promise<ReturnType<typeof mcpText> | ReturnType<typeof mcpError>> {
  try {
    return await fn();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : String(err);
    return mcpError(message.slice(0, 500));
  }
}
