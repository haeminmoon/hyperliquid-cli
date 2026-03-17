import { HyperliquidClient } from '../client/api-client';

/**
 * Parse a coin string that may include a HIP-3 dex prefix.
 * Examples: "BTC" → { dex: undefined, coin: "BTC" }
 *           "xyz:CL" → { dex: "xyz", coin: "xyz:CL" }
 */
export function parseCoinDex(coin: string): { dex: string | undefined; coin: string } {
  const colonIdx = coin.indexOf(':');
  if (colonIdx === -1) return { dex: undefined, coin };
  const dex = coin.slice(0, colonIdx);
  return { dex, coin };
}

/**
 * Resolve the asset offset for a HIP-3 dex.
 * perpDexs returns [null, {name:"xyz",...}, ...] — index 0 is the validator dex.
 * Builder dexes start at 110000, each 10000 apart.
 */
async function resolveDexOffset(dex: string, client: HyperliquidClient): Promise<number> {
  const dexes = (await client.getPerpDexs()) as Array<{ name: string } | null>;
  for (let i = 1; i < dexes.length; i++) {
    if (dexes[i]?.name === dex) {
      return 110000 + (i - 1) * 10000;
    }
  }
  throw new Error(`Perp dex "${dex}" not found. Check available dexes.`);
}

/**
 * Resolve a coin name to its Hyperliquid asset index.
 *
 * - Perpetuals: index in meta.universe (BTC=0, ETH=1, ...)
 * - HIP-3 perps: 110000 + (dex_order-1)*10000 + index_in_meta
 * - Spot: 10000 + index in spotMeta.universe
 */
export async function resolveAssetIndex(coin: string, client: HyperliquidClient): Promise<number> {
  const { dex } = parseCoinDex(coin);

  const meta = (await client.getMeta(dex)) as { universe: Array<{ name: string }> };
  const idx = meta.universe.findIndex(
    (u) => u.name.toUpperCase() === coin.toUpperCase(),
  );

  if (idx !== -1) {
    if (dex) {
      const offset = await resolveDexOffset(dex, client);
      return offset + idx;
    }
    return idx;
  }

  // Only search spot if there's no dex prefix (HIP-3 is perps only)
  if (!dex) {
    const spotMeta = (await client.getSpotMeta()) as {
      universe: Array<{ name: string; index: number }>;
    };
    const spotIdx = spotMeta.universe.findIndex(
      (u) => u.name.toUpperCase() === coin.toUpperCase(),
    );
    if (spotIdx !== -1) return 10000 + spotIdx;
  }

  throw new Error(`Asset "${coin}" not found in perpetuals or spot markets.`);
}
