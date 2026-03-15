import { ethers } from 'ethers';
import { encode } from '@msgpack/msgpack';
import { L1_DOMAIN, Environment } from '../config/constants';

/**
 * EIP-712 types for the phantom agent construct.
 */
const AGENT_TYPES = {
  Agent: [
    { name: 'source', type: 'string' },
    { name: 'connectionId', type: 'bytes32' },
  ],
};

/**
 * Remove ALL trailing zeros from a decimal string.
 * "30000.00" -> "30000", "30000.10" -> "30000.1", "30000" -> "30000"
 * This must match the server's formatDecimal exactly.
 */
function formatDecimal(numStr: string): string {
  if (!numStr.includes('.')) return numStr;
  const [intPart, fracPart] = numStr.split('.');
  const newFrac = fracPart.replace(/0+$/, '');
  return newFrac ? `${intPart}.${newFrac}` : intPart;
}

/**
 * Sort order type field (limit or trigger).
 */
function sortOrderType(t: Record<string, unknown>): Record<string, unknown> {
  if ('limit' in t) {
    return { limit: { tif: (t.limit as Record<string, unknown>).tif } };
  }
  const trigger = t.trigger as Record<string, unknown>;
  return {
    trigger: {
      isMarket: trigger.isMarket,
      triggerPx: formatDecimal(trigger.triggerPx as string),
      tpsl: trigger.tpsl,
    },
  };
}

/**
 * Sort action keys in the exact order expected by the Hyperliquid server.
 * Key ordering affects msgpack encoding, which affects the signature hash.
 * Must match the server-side sorting exactly.
 */
function sortAction(action: Record<string, unknown>): Record<string, unknown> {
  const type = action.type as string;

  switch (type) {
    case 'order': {
      const sorted: Record<string, unknown> = {
        type: action.type,
        orders: (action.orders as Record<string, unknown>[]).map((order) => {
          const o: Record<string, unknown> = {
            a: order.a,
            b: order.b,
            p: formatDecimal(order.p as string),
            s: formatDecimal(order.s as string),
            r: order.r,
            t: sortOrderType(order.t as Record<string, unknown>),
          };
          if (order.c !== undefined) o.c = order.c;
          return o;
        }),
        grouping: action.grouping,
      };
      if (action.builder !== undefined) {
        const builder = action.builder as { b: string; f: number };
        sorted.builder = { b: builder.b.toLowerCase(), f: builder.f };
      }
      return sorted;
    }

    case 'cancel':
      return {
        type: action.type,
        cancels: (action.cancels as Record<string, unknown>[]).map((c) => ({
          a: c.a,
          o: c.o,
        })),
      };

    case 'cancelByCloid':
      return {
        type: action.type,
        cancels: (action.cancels as Record<string, unknown>[]).map((c) => ({
          asset: c.asset,
          cloid: c.cloid,
        })),
      };

    case 'modify': {
      const order = action.order as Record<string, unknown>;
      const sortedOrder: Record<string, unknown> = {
        a: order.a,
        b: order.b,
        p: formatDecimal(order.p as string),
        s: formatDecimal(order.s as string),
        r: order.r,
        t: sortOrderType(order.t as Record<string, unknown>),
      };
      if (order.c !== undefined) sortedOrder.c = order.c;
      return {
        type: action.type,
        oid: action.oid,
        order: sortedOrder,
      };
    }

    case 'batchModify':
      return {
        type: action.type,
        modifies: (action.modifies as Record<string, unknown>[]).map((m) => {
          const order = m.order as Record<string, unknown>;
          const sortedOrder: Record<string, unknown> = {
            a: order.a,
            b: order.b,
            p: formatDecimal(order.p as string),
            s: formatDecimal(order.s as string),
            r: order.r,
            t: sortOrderType(order.t as Record<string, unknown>),
          };
          if (order.c !== undefined) sortedOrder.c = order.c;
          return { oid: m.oid, order: sortedOrder };
        }),
      };

    case 'updateLeverage':
      return {
        type: action.type,
        asset: action.asset,
        isCross: action.isCross,
        leverage: action.leverage,
      };

    case 'updateIsolatedMargin':
      return {
        type: action.type,
        asset: action.asset,
        isBuy: action.isBuy,
        ntli: action.ntli,
      };

    case 'twapOrder':
      return {
        type: action.type,
        twap: (() => {
          const t = action.twap as Record<string, unknown>;
          return {
            a: t.a,
            b: t.b,
            s: formatDecimal(t.s as string),
            r: t.r,
            m: t.m,
            t: t.t,
          };
        })(),
      };

    case 'twapCancel':
      return {
        type: action.type,
        a: action.a,
        t: action.t,
      };

    case 'scheduleCancel': {
      const sorted: Record<string, unknown> = { type: action.type };
      if (action.time !== undefined) sorted.time = action.time;
      return sorted;
    }

    case 'setReferrer':
      return {
        type: action.type,
        code: action.code,
      };

    case 'vaultTransfer':
      return {
        type: action.type,
        vaultAddress: action.vaultAddress,
        isDeposit: action.isDeposit,
        usd: action.usd,
      };

    case 'vaultDistribute':
      return {
        type: action.type,
        vaultAddress: action.vaultAddress,
        usd: action.usd,
      };

    case 'createSubAccount':
      return {
        type: action.type,
        name: action.name,
      };

    case 'subAccountTransfer':
      return {
        type: action.type,
        subAccountUser: (action.subAccountUser as string).toLowerCase(),
        isDeposit: action.isDeposit,
        usd: action.usd,
      };

    case 'subAccountSpotTransfer':
      return {
        type: action.type,
        subAccountUser: (action.subAccountUser as string).toLowerCase(),
        isDeposit: action.isDeposit,
        token: action.token,
        amount: action.amount,
      };

    case 'registerReferrer':
      return {
        type: action.type,
        code: action.code,
      };

    case 'claimRewards':
      return {
        type: action.type,
      };

    case 'evmUserModify':
      return {
        type: action.type,
        usingBigBlocks: action.usingBigBlocks,
      };

    default:
      return action;
  }
}

/**
 * Construct the phantom agent hash from an action + nonce + optional vault address.
 *
 * Steps:
 * 1. Sort the action keys in deterministic order
 * 2. Msgpack encode the sorted action
 * 3. Append nonce (8 bytes big-endian)
 * 4. Append vault marker (1 byte: 0x00 without vault, 0x01 + 20-byte address with vault)
 * 5. Keccak256 hash
 */
function constructPhantomAgentHash(
  action: Record<string, unknown>,
  nonce: number,
  vaultAddress?: string,
): string {
  // 1. Sort action keys
  const sorted = sortAction(action);

  // 2. Msgpack encode
  const actionBytes = encode(sorted);

  // 3. Nonce as 8-byte big-endian
  const nonceBytes = new Uint8Array(8);
  new DataView(nonceBytes.buffer).setBigUint64(0, BigInt(nonce));

  // 4. Vault marker: 0x00 (no vault) or 0x01 + address (with vault)
  const vaultMarker = vaultAddress ? Uint8Array.of(1) : Uint8Array.of(0);
  const vaultBytes = vaultAddress
    ? Uint8Array.from(Buffer.from(vaultAddress.replace('0x', ''), 'hex'))
    : new Uint8Array();

  // 5. Concatenate and hash
  const totalLen = actionBytes.length + nonceBytes.length + vaultMarker.length + vaultBytes.length;
  const payload = new Uint8Array(totalLen);
  let offset = 0;
  payload.set(actionBytes, offset); offset += actionBytes.length;
  payload.set(nonceBytes, offset); offset += nonceBytes.length;
  payload.set(vaultMarker, offset); offset += vaultMarker.length;
  payload.set(vaultBytes, offset);

  return ethers.keccak256(payload);
}

export interface L1Signature {
  r: string;
  s: string;
  v: number;
}

/**
 * Sign an L1 action using the phantom agent scheme.
 *
 * @param privateKey - Hex private key (with or without 0x prefix)
 * @param action - The action object to sign
 * @param nonce - Nonce (typically current timestamp in ms)
 * @param env - Environment (mainnet or testnet)
 * @param vaultAddress - Optional vault address
 * @returns The signature { r, s, v }
 */
export async function signL1Action(
  privateKey: string,
  action: Record<string, unknown>,
  nonce: number,
  env: Environment,
  vaultAddress?: string,
): Promise<L1Signature> {
  const wallet = new ethers.Wallet(privateKey);

  const connectionId = constructPhantomAgentHash(action, nonce, vaultAddress);
  const source = env === 'mainnet' ? 'a' : 'b';

  const signature = await wallet.signTypedData(
    L1_DOMAIN,
    AGENT_TYPES,
    { source, connectionId },
  );

  const sig = ethers.Signature.from(signature);
  return {
    r: sig.r,
    s: sig.s,
    v: sig.v,
  };
}

/**
 * Get the wallet address from a private key.
 */
export function getAddressFromKey(privateKey: string): string {
  const wallet = new ethers.Wallet(privateKey);
  return wallet.address;
}
