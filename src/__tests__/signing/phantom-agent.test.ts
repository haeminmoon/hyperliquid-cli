import { signL1Action, getAddressFromKey } from '../../signing/phantom-agent';
import { TEST_PRIVATE_KEY, TEST_ADDRESS } from '../fixtures';

describe('getAddressFromKey', () => {
  it('derives correct address from private key', () => {
    const address = getAddressFromKey(TEST_PRIVATE_KEY);
    expect(address).toBe(TEST_ADDRESS);
  });

  it('returns checksummed address', () => {
    const address = getAddressFromKey(TEST_PRIVATE_KEY);
    expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    // Should contain mixed case (checksum)
    expect(address).not.toBe(address.toLowerCase());
  });

  it('handles key without 0x prefix', () => {
    const keyWithout0x = TEST_PRIVATE_KEY.replace('0x', '');
    const address = getAddressFromKey(keyWithout0x);
    expect(address).toBe(TEST_ADDRESS);
  });
});

describe('signL1Action', () => {
  const sampleAction = {
    type: 'order',
    orders: [
      {
        a: 0,
        b: true,
        p: '30000.0',
        s: '0.1',
        r: false,
        t: { limit: { tif: 'Gtc' } },
      },
    ],
    grouping: 'na',
  };

  it('returns valid signature format', async () => {
    const sig = await signL1Action(TEST_PRIVATE_KEY, sampleAction, 1700000000000, 'mainnet');
    expect(sig).toHaveProperty('r');
    expect(sig).toHaveProperty('s');
    expect(sig).toHaveProperty('v');
    expect(sig.r).toMatch(/^0x[0-9a-f]{64}$/);
    expect(sig.s).toMatch(/^0x[0-9a-f]{64}$/);
    expect([27, 28]).toContain(sig.v);
  });

  it('produces deterministic signatures for same input', async () => {
    const sig1 = await signL1Action(TEST_PRIVATE_KEY, sampleAction, 1700000000000, 'mainnet');
    const sig2 = await signL1Action(TEST_PRIVATE_KEY, sampleAction, 1700000000000, 'mainnet');
    expect(sig1).toEqual(sig2);
  });

  it('produces different signatures for different nonces', async () => {
    const sig1 = await signL1Action(TEST_PRIVATE_KEY, sampleAction, 1700000000000, 'mainnet');
    const sig2 = await signL1Action(TEST_PRIVATE_KEY, sampleAction, 1700000000001, 'mainnet');
    expect(sig1.r).not.toBe(sig2.r);
  });

  it('produces different source for mainnet vs testnet', async () => {
    const sig1 = await signL1Action(TEST_PRIVATE_KEY, sampleAction, 1700000000000, 'mainnet');
    const sig2 = await signL1Action(TEST_PRIVATE_KEY, sampleAction, 1700000000000, 'testnet');
    // Different source ('a' vs 'b') leads to different signatures
    expect(sig1.r).not.toBe(sig2.r);
  });

  it('handles cancel action', async () => {
    const cancelAction = {
      type: 'cancel',
      cancels: [{ a: 0, o: 12345 }],
    };
    const sig = await signL1Action(TEST_PRIVATE_KEY, cancelAction, 1700000000000, 'mainnet');
    expect(sig.r).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('handles updateLeverage action', async () => {
    const leverageAction = {
      type: 'updateLeverage',
      asset: 0,
      isCross: true,
      leverage: 10,
    };
    const sig = await signL1Action(TEST_PRIVATE_KEY, leverageAction, 1700000000000, 'mainnet');
    expect(sig.r).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('handles order with builder fee', async () => {
    const orderWithBuilder = {
      ...sampleAction,
      builder: { b: '0xa6f967d47c6f85a5ba4fc43543e5e1c171cccf98', f: 1 },
    };
    const sig = await signL1Action(TEST_PRIVATE_KEY, orderWithBuilder, 1700000000000, 'mainnet');
    expect(sig.r).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('handles order with trigger type', async () => {
    const triggerAction = {
      type: 'order',
      orders: [
        {
          a: 0,
          b: false,
          p: '0',
          s: '0.1',
          r: true,
          t: { trigger: { triggerPx: '65000.00', isMarket: true, tpsl: 'sl' } },
        },
      ],
      grouping: 'na',
    };
    const sig = await signL1Action(TEST_PRIVATE_KEY, triggerAction, 1700000000000, 'mainnet');
    expect(sig.r).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('handles twapOrder action', async () => {
    const twapAction = {
      type: 'twapOrder',
      twap: { a: 0, b: true, s: '1.0', r: false, m: 30, t: true },
    };
    const sig = await signL1Action(TEST_PRIVATE_KEY, twapAction, 1700000000000, 'mainnet');
    expect(sig.r).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('formats decimal values correctly in signatures', async () => {
    // Action with trailing zeros that must be stripped
    const action1 = {
      type: 'order',
      orders: [{ a: 0, b: true, p: '30000.00', s: '0.10', r: false, t: { limit: { tif: 'Gtc' } } }],
      grouping: 'na',
    };
    // Action with already-stripped values
    const action2 = {
      type: 'order',
      orders: [{ a: 0, b: true, p: '30000', s: '0.1', r: false, t: { limit: { tif: 'Gtc' } } }],
      grouping: 'na',
    };
    const sig1 = await signL1Action(TEST_PRIVATE_KEY, action1, 1700000000000, 'mainnet');
    const sig2 = await signL1Action(TEST_PRIVATE_KEY, action2, 1700000000000, 'mainnet');
    // formatDecimal should normalize both to same values
    expect(sig1).toEqual(sig2);
  });

  it('handles modify action', async () => {
    const modifyAction = {
      type: 'modify',
      oid: 12345,
      order: {
        a: 0,
        b: true,
        p: '31000.0',
        s: '0.2',
        r: false,
        t: { limit: { tif: 'Gtc' } },
      },
    };
    const sig = await signL1Action(TEST_PRIVATE_KEY, modifyAction, 1700000000000, 'mainnet');
    expect(sig.r).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('handles scheduleCancel action', async () => {
    const action = { type: 'scheduleCancel', time: 1700000060000 };
    const sig = await signL1Action(TEST_PRIVATE_KEY, action, 1700000000000, 'mainnet');
    expect(sig.r).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('handles vaultTransfer action', async () => {
    const action = {
      type: 'vaultTransfer',
      vaultAddress: '0x1234567890abcdef1234567890abcdef12345678',
      isDeposit: true,
      usd: 100000000,
    };
    const sig = await signL1Action(TEST_PRIVATE_KEY, action, 1700000000000, 'mainnet');
    expect(sig.r).toMatch(/^0x[0-9a-f]{64}$/);
  });
});
