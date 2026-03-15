import { ethers } from 'ethers';

/**
 * Validate an Ethereum address, throwing a descriptive error on failure.
 */
export function validateAddress(address: string, name: string): void {
  if (!ethers.isAddress(address)) {
    throw new Error(`Invalid ${name}: "${address}" is not a valid Ethereum address.`);
  }
}
