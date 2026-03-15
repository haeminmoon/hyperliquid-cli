import { HyperliquidClient } from '../client/api-client';
import { getEffectiveConfig } from '../config/store';
import { ActionableError } from '../output/error';

/**
 * Create a public client (no auth needed, for market data).
 */
export function createPublicClient(): HyperliquidClient {
  const config = getEffectiveConfig();
  return new HyperliquidClient(config.env);
}

/**
 * Create an authenticated client (requires private key).
 */
export function createAuthClient(): HyperliquidClient {
  const config = getEffectiveConfig();
  if (!config.privateKey) {
    throw new ActionableError(
      'Private key is not configured.',
      'hyperliquid-cli config init',
    );
  }
  return new HyperliquidClient(config.env, config.privateKey, config.walletAddress);
}

/**
 * Get wallet address from config or derive from private key.
 */
export function getWalletAddress(): string {
  const config = getEffectiveConfig();
  if (config.walletAddress) return config.walletAddress;
  if (config.privateKey) {
    const client = new HyperliquidClient(config.env, config.privateKey);
    const address = client.getAddress();
    if (!address) {
      throw new ActionableError(
        'Could not derive wallet address from private key.',
        'hyperliquid-cli config init',
      );
    }
    return address;
  }
  throw new ActionableError(
    'Wallet address is not configured.',
    'hyperliquid-cli config init',
  );
}
