import { BASE_URLS, Environment, SIGNATURE_CHAIN_ID, CandleInterval, BUILDER_ADDRESS, BUILDER_FEE, CANDLE_MAX_PER_REQUEST } from '../config/constants';
import { signL1Action, getAddressFromKey } from '../signing/phantom-agent';
import { signUserSignedAction } from '../signing/user-signed-action';
import { ensureSetup } from '../setup/auto-setup';
import { nowMs, floatToWire } from '../utils/helpers';

const REQUEST_TIMEOUT_MS = 30_000;

function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return fetch(url, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timeoutId),
  );
}

async function parseErrorResponse(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    return json.error ?? json.message ?? text;
  } catch {
    return text;
  }
}

/**
 * Hyperliquid API Client.
 * Handles both /info (read-only) and /exchange (signed) endpoints.
 */
export class HyperliquidClient {
  private baseUrl: string;
  private env: Environment;
  private privateKey?: string;
  private walletAddress?: string;

  constructor(env: Environment, privateKey?: string, walletAddress?: string) {
    this.env = env;
    this.baseUrl = BASE_URLS[env];
    if (!this.baseUrl) {
      throw new Error(`Invalid environment: ${env}. Use: mainnet, testnet`);
    }
    this.privateKey = privateKey;
    if (walletAddress) {
      this.walletAddress = walletAddress;
    } else if (privateKey) {
      this.walletAddress = getAddressFromKey(privateKey);
    }
  }

  // ─── Info Endpoint (POST /info) ─────────────────────────────────────

  private async info(body: Record<string, unknown>): Promise<unknown> {
    const res = await fetchWithTimeout(`${this.baseUrl}/info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`Info API error (${res.status}): ${await parseErrorResponse(res)}`);
    }
    return res.json();
  }

  // ─── Exchange Endpoint (POST /exchange) ─────────────────────────────

  private async exchange(
    action: Record<string, unknown>,
    nonce?: number,
    vaultAddress?: string,
  ): Promise<unknown> {
    if (!this.privateKey) {
      throw new Error('Private key required for exchange operations. Run: hyperliquid-cli config init');
    }

    const ts = nonce ?? nowMs();
    const signature = await signL1Action(this.privateKey, action, ts, this.env, vaultAddress);

    const body: Record<string, unknown> = {
      action,
      nonce: ts,
      signature,
    };
    if (vaultAddress) body.vaultAddress = vaultAddress;

    const res = await fetchWithTimeout(`${this.baseUrl}/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`Exchange API error (${res.status}): ${await parseErrorResponse(res)}`);
    }
    return res.json();
  }

  // ─── User Signed Action (POST /exchange) ────────────────────────────

  private async userSignedExchange(
    actionType: string,
    action: Record<string, unknown>,
    signatureMessage: Record<string, unknown>,
    nonce?: number,
  ): Promise<unknown> {
    if (!this.privateKey) {
      throw new Error('Private key required. Run: hyperliquid-cli config init');
    }

    const ts = nonce ?? nowMs();
    const signature = await signUserSignedAction(
      this.privateKey,
      actionType,
      signatureMessage,
      this.env,
    );

    const body = {
      action,
      nonce: ts,
      signature,
    };

    const res = await fetchWithTimeout(`${this.baseUrl}/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`Exchange API error (${res.status}): ${await parseErrorResponse(res)}`);
    }
    return res.json();
  }

  // ─── Market Data (Info) ─────────────────────────────────────────────

  async getAllMids(): Promise<Record<string, string>> {
    return this.info({ type: 'allMids' }) as Promise<Record<string, string>>;
  }

  async getMeta(dex?: string): Promise<unknown> {
    const body: Record<string, unknown> = { type: 'meta' };
    if (dex) body.dex = dex;
    return this.info(body);
  }

  async getMetaAndAssetCtxs(dex?: string): Promise<unknown> {
    const body: Record<string, unknown> = { type: 'metaAndAssetCtxs' };
    if (dex) body.dex = dex;
    return this.info(body);
  }

  async getSpotMeta(): Promise<unknown> {
    return this.info({ type: 'spotMeta' });
  }

  async getPerpDexs(): Promise<unknown> {
    return this.info({ type: 'perpDexs' });
  }

  async getSpotMetaAndAssetCtxs(): Promise<unknown> {
    return this.info({ type: 'spotMetaAndAssetCtxs' });
  }

  async getL2Book(coin: string, nSigFigs?: number, mantissa?: number, dex?: string): Promise<unknown> {
    const body: Record<string, unknown> = { type: 'l2Book', coin };
    if (nSigFigs !== undefined) body.nSigFigs = nSigFigs;
    if (mantissa !== undefined) body.mantissa = mantissa;
    if (dex) body.dex = dex;
    return this.info(body);
  }

  /**
   * Fetch a single candle snapshot. The endpoint returns at most
   * CANDLE_MAX_PER_REQUEST (5000) candles per request within [startTime, endTime].
   */
  async getCandleSnapshot(
    coin: string,
    interval: CandleInterval,
    startTime: number,
    endTime?: number,
    dex?: string,
  ): Promise<Candle[]> {
    const body: Record<string, unknown> = {
      type: 'candleSnapshot',
      req: {
        coin,
        interval,
        startTime,
        endTime: endTime ?? nowMs(),
      },
    };
    if (dex) body.dex = dex;
    return this.info(body) as Promise<Candle[]>;
  }

  /**
   * Fetch up to `maxTotal` candles via time-range windowing.
   *
   * Hyperliquid's candleSnapshot has no cursor and caps each request at
   * CANDLE_MAX_PER_REQUEST (5000) candles. To collect more, we repeat the
   * request walking backwards in time: each page keeps the same `startTime`
   * but sets `endTime = (oldest candle returned).t - 1ms`, until we have
   * `maxTotal` candles, the window is exhausted, or a page returns nothing.
   *
   * Results are de-duplicated by open time (`t`), sorted ascending by time,
   * and truncated to the most recent `maxTotal` candles.
   */
  async getCandleSnapshotPaginated(
    coin: string,
    interval: CandleInterval,
    startTime: number,
    endTime: number,
    maxTotal: number,
    dex?: string,
  ): Promise<Candle[]> {
    const byTime = new Map<number, Candle>();
    let windowEnd = endTime;

    // Hard cap on iterations to avoid runaway loops; each page yields up to
    // CANDLE_MAX_PER_REQUEST candles, so this comfortably covers maxTotal.
    const maxPages = Math.ceil(maxTotal / CANDLE_MAX_PER_REQUEST) + 2;

    for (let page = 0; page < maxPages; page++) {
      if (windowEnd <= startTime) break;

      const batch = await this.getCandleSnapshot(
        coin,
        interval,
        startTime,
        windowEnd,
        dex,
      );
      if (!Array.isArray(batch) || batch.length === 0) break;

      let oldest = windowEnd;
      let added = 0;
      for (const candle of batch) {
        if (!byTime.has(candle.t)) {
          byTime.set(candle.t, candle);
          added++;
        }
        if (candle.t < oldest) oldest = candle.t;
      }

      if (byTime.size >= maxTotal) break;
      // No new candles or no further window to walk into → exhausted.
      if (added === 0 || oldest <= startTime) break;

      // Walk backwards: next window ends just before the oldest candle seen.
      windowEnd = oldest - 1;
    }

    const sorted = Array.from(byTime.values()).sort((a, b) => a.t - b.t);
    // Keep the most recent `maxTotal` candles (never exceed requested count).
    return sorted.length > maxTotal ? sorted.slice(sorted.length - maxTotal) : sorted;
  }

  async getFundingHistory(coin: string, startTime: number, endTime?: number, dex?: string): Promise<unknown> {
    const body: Record<string, unknown> = {
      type: 'fundingHistory',
      coin,
      startTime,
      endTime: endTime ?? nowMs(),
    };
    if (dex) body.dex = dex;
    return this.info(body);
  }

  async getPredictedFundings(): Promise<unknown> {
    return this.info({ type: 'predictedFundings' });
  }

  async getRecentTrades(coin: string, dex?: string): Promise<unknown> {
    const body: Record<string, unknown> = { type: 'recentTrades', coin };
    if (dex) body.dex = dex;
    return this.info(body);
  }

  // ─── User Info ──────────────────────────────────────────────────────

  private getUserAddress(): string {
    if (!this.walletAddress) {
      throw new Error('Wallet address required. Run: hyperliquid-cli config init');
    }
    return this.walletAddress;
  }

  async getOpenOrders(user?: string): Promise<unknown> {
    return this.info({ type: 'frontendOpenOrders', user: user ?? this.getUserAddress() });
  }

  async getUserFills(user?: string, aggregateByTime = true): Promise<unknown> {
    return this.info({
      type: 'userFills',
      user: user ?? this.getUserAddress(),
      aggregateByTime,
    });
  }

  async getUserFillsByTime(
    startTime: number,
    endTime?: number,
    user?: string,
  ): Promise<unknown> {
    return this.info({
      type: 'userFillsByTime',
      user: user ?? this.getUserAddress(),
      startTime,
      endTime: endTime ?? nowMs(),
      aggregateByTime: true,
    });
  }

  async getClearinghouseState(user?: string): Promise<unknown> {
    return this.info({
      type: 'clearinghouseState',
      user: user ?? this.getUserAddress(),
    });
  }

  async getSpotClearinghouseState(user?: string): Promise<unknown> {
    return this.info({
      type: 'spotClearinghouseState',
      user: user ?? this.getUserAddress(),
    });
  }

  async getOrderStatus(oid: number | string, user?: string): Promise<unknown> {
    return this.info({
      type: 'orderStatus',
      user: user ?? this.getUserAddress(),
      oid: typeof oid === 'string' ? oid : Number(oid),
    });
  }

  async getHistoricalOrders(user?: string): Promise<unknown> {
    return this.info({
      type: 'historicalOrders',
      user: user ?? this.getUserAddress(),
    });
  }

  async getUserRateLimit(user?: string): Promise<unknown> {
    return this.info({
      type: 'userRateLimit',
      user: user ?? this.getUserAddress(),
    });
  }

  async getUserFunding(startTime: number, endTime?: number, user?: string): Promise<unknown> {
    return this.info({
      type: 'userFunding',
      user: user ?? this.getUserAddress(),
      startTime,
      endTime: endTime ?? nowMs(),
    });
  }

  async getUserFees(user?: string): Promise<unknown> {
    return this.info({
      type: 'userFees',
      user: user ?? this.getUserAddress(),
    });
  }

  async getSubAccounts(user?: string): Promise<unknown> {
    return this.info({
      type: 'subAccounts',
      user: user ?? this.getUserAddress(),
    });
  }

  async getPortfolio(user?: string): Promise<unknown> {
    return this.info({
      type: 'portfolio',
      user: user ?? this.getUserAddress(),
    });
  }

  async getUserRole(user?: string): Promise<unknown> {
    return this.info({
      type: 'userRole',
      user: user ?? this.getUserAddress(),
    });
  }

  async getReferral(user?: string): Promise<unknown> {
    return this.info({
      type: 'referral',
      user: user ?? this.getUserAddress(),
    });
  }

  async getMaxBuilderFee(builder: string, user?: string): Promise<unknown> {
    return this.info({
      type: 'maxBuilderFee',
      user: user ?? this.getUserAddress(),
      builder,
    });
  }

  async getTokenDetails(tokenId: string): Promise<unknown> {
    return this.info({ type: 'tokenDetails', tokenId });
  }

  async getVaultDetails(vaultAddress: string, user?: string): Promise<unknown> {
    return this.info({
      type: 'vaultDetails',
      vaultAddress,
      user: user ?? this.getUserAddress(),
    });
  }

  async getUserVaultEquities(user?: string): Promise<unknown> {
    return this.info({
      type: 'userVaultEquities',
      user: user ?? this.getUserAddress(),
    });
  }

  // ─── Perpetuals-Specific Info ───────────────────────────────────────

  async getActiveAssetData(coin: string, user?: string): Promise<unknown> {
    return this.info({
      type: 'activeAssetData',
      user: user ?? this.getUserAddress(),
      coin,
    });
  }

  async getPerpsAtOpenInterestCap(): Promise<unknown> {
    return this.info({ type: 'perpsAtOpenInterestCap' });
  }

  // ─── Exchange Actions ───────────────────────────────────────────────

  async placeOrder(orders: OrderRequest[], grouping = 'na'): Promise<unknown> {
    await ensureSetup(this);

    const action: Record<string, unknown> = {
      type: 'order',
      orders: orders.map((o) => ({
        a: o.asset,
        b: o.isBuy,
        p: floatToWire(o.price),
        s: floatToWire(o.size),
        r: o.reduceOnly ?? false,
        t: o.orderType,
        ...(o.cloid ? { c: o.cloid } : {}),
      })),
      grouping,
    };

    action.builder = { b: BUILDER_ADDRESS, f: BUILDER_FEE };

    return this.exchange(action);
  }

  async cancelOrder(cancels: Array<{ asset: number; oid: number }>): Promise<unknown> {
    return this.exchange({
      type: 'cancel',
      cancels: cancels.map((c) => ({ a: c.asset, o: c.oid })),
    });
  }

  async cancelByCloid(cancels: Array<{ asset: number; cloid: string }>): Promise<unknown> {
    return this.exchange({
      type: 'cancelByCloid',
      cancels,
    });
  }

  async modifyOrder(oid: number, order: OrderRequest): Promise<unknown> {
    return this.exchange({
      type: 'modify',
      oid,
      order: {
        a: order.asset,
        b: order.isBuy,
        p: floatToWire(order.price),
        s: floatToWire(order.size),
        r: order.reduceOnly ?? false,
        t: order.orderType,
        ...(order.cloid ? { c: order.cloid } : {}),
      },
    });
  }

  async batchModify(modifies: Array<{ oid: number; order: OrderRequest }>): Promise<unknown> {
    return this.exchange({
      type: 'batchModify',
      modifies: modifies.map((m) => ({
        oid: m.oid,
        order: {
          a: m.order.asset,
          b: m.order.isBuy,
          p: floatToWire(m.order.price),
          s: floatToWire(m.order.size),
          r: m.order.reduceOnly ?? false,
          t: m.order.orderType,
          ...(m.order.cloid ? { c: m.order.cloid } : {}),
        },
      })),
    });
  }

  async scheduleCancel(time: number): Promise<unknown> {
    return this.exchange({ type: 'scheduleCancel', time });
  }

  async updateLeverage(asset: number, isCross: boolean, leverage: number): Promise<unknown> {
    return this.exchange({
      type: 'updateLeverage',
      asset,
      isCross,
      leverage,
    });
  }

  async updateIsolatedMargin(asset: number, isBuy: boolean, ntli: number): Promise<unknown> {
    return this.exchange({
      type: 'updateIsolatedMargin',
      asset,
      isBuy,
      ntli,
    });
  }

  async setReferrer(code: string): Promise<unknown> {
    return this.exchange({ type: 'setReferrer', code });
  }

  async twapOrder(twap: TwapRequest): Promise<unknown> {
    return this.exchange({
      type: 'twapOrder',
      twap: {
        a: twap.asset,
        b: twap.isBuy,
        s: floatToWire(twap.size),
        r: twap.reduceOnly ?? false,
        m: twap.durationMinutes,
        t: twap.randomize ?? true,
      },
    });
  }

  async twapCancel(asset: number, twapId: number): Promise<unknown> {
    return this.exchange({
      type: 'twapCancel',
      a: asset,
      t: twapId,
    });
  }

  // ─── User Signed Actions ───────────────────────────────────────────

  async usdSend(destination: string, amount: string): Promise<unknown> {
    const time = nowMs();
    const chainLabel = this.env === 'mainnet' ? 'Mainnet' : 'Testnet';
    const action = {
      type: 'usdSend',
      hyperliquidChain: chainLabel,
      signatureChainId: SIGNATURE_CHAIN_ID[this.env],
      destination,
      amount,
      time,
    };
    return this.userSignedExchange('usdSend', action, {
      hyperliquidChain: chainLabel,
      destination,
      amount,
      time,
    });
  }

  async spotSend(destination: string, token: string, amount: string): Promise<unknown> {
    const time = nowMs();
    const chainLabel = this.env === 'mainnet' ? 'Mainnet' : 'Testnet';
    const action = {
      type: 'spotSend',
      hyperliquidChain: chainLabel,
      signatureChainId: SIGNATURE_CHAIN_ID[this.env],
      destination,
      token,
      amount,
      time,
    };
    return this.userSignedExchange('spotSend', action, {
      hyperliquidChain: chainLabel,
      destination,
      token,
      amount,
      time,
    });
  }

  async withdraw(destination: string, amount: string): Promise<unknown> {
    const time = nowMs();
    const chainLabel = this.env === 'mainnet' ? 'Mainnet' : 'Testnet';
    const action = {
      type: 'withdraw3',
      hyperliquidChain: chainLabel,
      signatureChainId: SIGNATURE_CHAIN_ID[this.env],
      destination,
      amount,
      time,
    };
    return this.userSignedExchange('withdraw3', action, {
      hyperliquidChain: chainLabel,
      destination,
      amount,
      time,
    });
  }

  async usdClassTransfer(amount: string, toPerp: boolean): Promise<unknown> {
    const nonce = nowMs();
    const chainLabel = this.env === 'mainnet' ? 'Mainnet' : 'Testnet';
    const action = {
      type: 'usdClassTransfer',
      hyperliquidChain: chainLabel,
      signatureChainId: SIGNATURE_CHAIN_ID[this.env],
      amount,
      toPerp,
      nonce,
    };
    return this.userSignedExchange('usdClassTransfer', action, {
      hyperliquidChain: chainLabel,
      amount,
      toPerp,
      nonce,
    });
  }

  async approveAgent(agentAddress: string, agentName?: string): Promise<unknown> {
    const nonce = nowMs();
    const chainLabel = this.env === 'mainnet' ? 'Mainnet' : 'Testnet';
    const action = {
      type: 'approveAgent',
      hyperliquidChain: chainLabel,
      signatureChainId: SIGNATURE_CHAIN_ID[this.env],
      agentAddress,
      agentName: agentName ?? '',
      nonce,
    };
    return this.userSignedExchange('approveAgent', action, {
      hyperliquidChain: chainLabel,
      agentAddress,
      agentName: agentName ?? '',
      nonce,
    });
  }

  async approveBuilderFee(builder: string, maxFeeRate: string): Promise<unknown> {
    const nonce = nowMs();
    const chainLabel = this.env === 'mainnet' ? 'Mainnet' : 'Testnet';
    const action = {
      type: 'approveBuilderFee',
      hyperliquidChain: chainLabel,
      signatureChainId: SIGNATURE_CHAIN_ID[this.env],
      maxFeeRate,
      builder,
      nonce,
    };
    return this.userSignedExchange('approveBuilderFee', action, {
      hyperliquidChain: chainLabel,
      maxFeeRate,
      builder,
      nonce,
    });
  }

  async vaultTransfer(vaultAddress: string, isDeposit: boolean, usd: number): Promise<unknown> {
    return this.exchange({
      type: 'vaultTransfer',
      vaultAddress,
      isDeposit,
      usd,
    });
  }

  // ─── Helpers ────────────────────────────────────────────────────────

  getAddress(): string | undefined {
    return this.walletAddress;
  }

  getEnv(): Environment {
    return this.env;
  }
}

// ─── Types ──────────────────────────────────────────────────────────────

/** OHLCV candle as returned by the candleSnapshot endpoint. */
export interface Candle {
  t: number; // open time (ms)
  T: number; // close time (ms)
  s: string; // coin symbol
  i: string; // interval
  o: string; // open
  c: string; // close
  h: string; // high
  l: string; // low
  v: string; // volume
  n: number; // number of trades
}

export interface OrderType {
  limit?: { tif: 'Gtc' | 'Alo' | 'Ioc' };
  trigger?: { triggerPx: string; isMarket: boolean; tpsl: 'tp' | 'sl' };
}

export interface OrderRequest {
  asset: number;
  isBuy: boolean;
  price: number | string;
  size: number | string;
  reduceOnly?: boolean;
  orderType: OrderType;
  cloid?: string;
}

export interface TwapRequest {
  asset: number;
  isBuy: boolean;
  size: number | string;
  reduceOnly?: boolean;
  durationMinutes: number;
  randomize?: boolean;
}
