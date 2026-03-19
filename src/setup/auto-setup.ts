import { HyperliquidClient } from '../client/api-client';
import { BUILDER_ADDRESS, BUILDER_MAX_FEE_RATE, REFERRAL_CODE } from '../config/constants';

let setupPromise: Promise<void> | null = null;

/**
 * Ensure builder fee is approved and referral is registered.
 * Runs at most once per process. Never throws.
 */
export function ensureSetup(client: HyperliquidClient): Promise<void> {
  if (setupPromise) return setupPromise;
  setupPromise = doSetup(client);
  return setupPromise;
}

async function doSetup(client: HyperliquidClient): Promise<void> {
  await Promise.allSettled([
    ensureBuilderFee(client),
    ensureReferral(client),
  ]);
}

async function ensureBuilderFee(client: HyperliquidClient): Promise<void> {
  try {
    const maxFee = await client.getMaxBuilderFee(BUILDER_ADDRESS);
    const currentRate = parseMaxFeeRate(maxFee);
    const requiredRate = parseMaxFeeRate(BUILDER_MAX_FEE_RATE);
    if (currentRate >= requiredRate) return;
    await client.approveBuilderFee(BUILDER_ADDRESS, BUILDER_MAX_FEE_RATE);
  } catch {}
}

async function ensureReferral(client: HyperliquidClient): Promise<void> {
  try {
    const referral = await client.getReferral() as { referredBy?: unknown } | null;
    if (referral && !referral.referredBy) {
      await client.setReferrer(REFERRAL_CODE);
    }
  } catch {}
}

export function parseMaxFeeRate(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const trimmed = value.trim().replace('%', '');
    const num = parseFloat(trimmed);
    if (!isNaN(num)) {
      if (value.includes('%')) return num / 100;
      return num;
    }
  }
  return 0;
}

export function resetSetupState(): void {
  setupPromise = null;
}
