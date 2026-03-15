import { ethers } from 'ethers';
import { getUserSignedActionDomain, Environment } from '../config/constants';

/**
 * EIP-712 types for user-signed actions (transfers, approvals, etc.).
 */
const USER_SIGNED_ACTION_TYPES: Record<string, Record<string, ethers.TypedDataField[]>> = {
  usdSend: {
    'HyperliquidTransaction:UsdSend': [
      { name: 'hyperliquidChain', type: 'string' },
      { name: 'destination', type: 'string' },
      { name: 'amount', type: 'string' },
      { name: 'time', type: 'uint64' },
    ],
  },
  spotSend: {
    'HyperliquidTransaction:SpotSend': [
      { name: 'hyperliquidChain', type: 'string' },
      { name: 'destination', type: 'string' },
      { name: 'token', type: 'string' },
      { name: 'amount', type: 'string' },
      { name: 'time', type: 'uint64' },
    ],
  },
  withdraw3: {
    'HyperliquidTransaction:Withdraw': [
      { name: 'hyperliquidChain', type: 'string' },
      { name: 'destination', type: 'string' },
      { name: 'amount', type: 'string' },
      { name: 'time', type: 'uint64' },
    ],
  },
  usdClassTransfer: {
    'HyperliquidTransaction:UsdClassTransfer': [
      { name: 'hyperliquidChain', type: 'string' },
      { name: 'amount', type: 'string' },
      { name: 'toPerp', type: 'bool' },
      { name: 'nonce', type: 'uint64' },
    ],
  },
  approveAgent: {
    'HyperliquidTransaction:ApproveAgent': [
      { name: 'hyperliquidChain', type: 'string' },
      { name: 'agentAddress', type: 'address' },
      { name: 'agentName', type: 'string' },
      { name: 'nonce', type: 'uint64' },
    ],
  },
  approveBuilderFee: {
    'HyperliquidTransaction:ApproveBuilderFee': [
      { name: 'hyperliquidChain', type: 'string' },
      { name: 'maxFeeRate', type: 'string' },
      { name: 'builder', type: 'address' },
      { name: 'nonce', type: 'uint64' },
    ],
  },
};

export interface UserSignature {
  r: string;
  s: string;
  v: number;
}

/**
 * Sign a user-signed action (transfers, agent approval, etc.).
 */
export async function signUserSignedAction(
  privateKey: string,
  actionType: string,
  message: Record<string, unknown>,
  env: Environment,
): Promise<UserSignature> {
  const domain = getUserSignedActionDomain(env);
  const types = USER_SIGNED_ACTION_TYPES[actionType];

  if (!types) {
    throw new Error(`Unknown user signed action type: ${actionType}`);
  }

  const wallet = new ethers.Wallet(privateKey);
  const signature = await wallet.signTypedData(domain, types, message);
  const sig = ethers.Signature.from(signature);

  return {
    r: sig.r,
    s: sig.s,
    v: sig.v,
  };
}
