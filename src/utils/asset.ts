import { HyperliquidClient } from '../client/api-client';

/**
 * Resolve a coin name to its Hyperliquid asset index.
 * Checks perpetuals first, then spot markets.
 *
 * - Perpetuals: index in meta.universe (BTC=0, ETH=1, ...)
 * - Spot: 10000 + index in spotMeta.universe
 */
export async function resolveAssetIndex(coin: string, client: HyperliquidClient): Promise<number> {
  const meta = (await client.getMeta()) as { universe: Array<{ name: string }> };
  const idx = meta.universe.findIndex(
    (u) => u.name.toUpperCase() === coin.toUpperCase(),
  );
  if (idx !== -1) return idx;

  const spotMeta = (await client.getSpotMeta()) as {
    universe: Array<{ name: string; index: number }>;
  };
  const spotIdx = spotMeta.universe.findIndex(
    (u) => u.name.toUpperCase() === coin.toUpperCase(),
  );
  if (spotIdx !== -1) return 10000 + spotIdx;

  throw new Error(`Asset "${coin}" not found in perpetuals or spot markets.`);
}
