import { signUserSignedAction } from '../../signing/user-signed-action';
import { TEST_PRIVATE_KEY } from '../fixtures';

describe('signUserSignedAction', () => {
  it('signs usdSend action', async () => {
    const sig = await signUserSignedAction(TEST_PRIVATE_KEY, 'usdSend', {
      hyperliquidChain: 'Mainnet',
      destination: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      amount: '100',
      time: 1700000000000,
    }, 'mainnet');

    expect(sig).toHaveProperty('r');
    expect(sig).toHaveProperty('s');
    expect(sig).toHaveProperty('v');
    expect(sig.r).toMatch(/^0x[0-9a-f]{64}$/);
    expect(sig.s).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('signs withdraw3 action', async () => {
    const sig = await signUserSignedAction(TEST_PRIVATE_KEY, 'withdraw3', {
      hyperliquidChain: 'Mainnet',
      destination: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      amount: '50',
      time: 1700000000000,
    }, 'mainnet');

    expect(sig.r).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('signs spotSend action', async () => {
    const sig = await signUserSignedAction(TEST_PRIVATE_KEY, 'spotSend', {
      hyperliquidChain: 'Mainnet',
      destination: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      token: 'PURR:0x1234',
      amount: '10',
      time: 1700000000000,
    }, 'mainnet');

    expect(sig.r).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('signs approveAgent action', async () => {
    const sig = await signUserSignedAction(TEST_PRIVATE_KEY, 'approveAgent', {
      hyperliquidChain: 'Mainnet',
      agentAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      agentName: 'test-agent',
      nonce: 1700000000000,
    }, 'mainnet');

    expect(sig.r).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('signs usdClassTransfer action', async () => {
    const sig = await signUserSignedAction(TEST_PRIVATE_KEY, 'usdClassTransfer', {
      hyperliquidChain: 'Mainnet',
      amount: '100',
      toPerp: true,
      nonce: 1700000000000,
    }, 'mainnet');

    expect(sig.r).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('signs approveBuilderFee action', async () => {
    const sig = await signUserSignedAction(TEST_PRIVATE_KEY, 'approveBuilderFee', {
      hyperliquidChain: 'Mainnet',
      maxFeeRate: '0.1%',
      builder: '0xa6f967d47c6f85a5ba4fc43543e5e1c171cccf98',
      nonce: 1700000000000,
    }, 'mainnet');

    expect(sig.r).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('produces different signatures for mainnet vs testnet', async () => {
    const message = {
      hyperliquidChain: 'Mainnet',
      destination: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      amount: '100',
      time: 1700000000000,
    };

    const sigMainnet = await signUserSignedAction(TEST_PRIVATE_KEY, 'usdSend', message, 'mainnet');
    const sigTestnet = await signUserSignedAction(TEST_PRIVATE_KEY, 'usdSend', {
      ...message,
      hyperliquidChain: 'Testnet',
    }, 'testnet');

    // Different domains (different chainId) → different signatures
    expect(sigMainnet.r).not.toBe(sigTestnet.r);
  });

  it('produces deterministic signatures', async () => {
    const message = {
      hyperliquidChain: 'Mainnet',
      destination: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      amount: '100',
      time: 1700000000000,
    };

    const sig1 = await signUserSignedAction(TEST_PRIVATE_KEY, 'usdSend', message, 'mainnet');
    const sig2 = await signUserSignedAction(TEST_PRIVATE_KEY, 'usdSend', message, 'mainnet');

    expect(sig1).toEqual(sig2);
  });

  it('throws for unknown action type', async () => {
    await expect(
      signUserSignedAction(TEST_PRIVATE_KEY, 'unknownAction', {}, 'mainnet'),
    ).rejects.toThrow('Unknown user signed action type: unknownAction');
  });
});
