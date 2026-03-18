import { ethers } from 'ethers';

// ─── Test Wallet ──────────────────────────────────────────────────────────
// Deterministic test wallet — NEVER use on mainnet
export const TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
export const TEST_WALLET = new ethers.Wallet(TEST_PRIVATE_KEY);
export const TEST_ADDRESS = TEST_WALLET.address; // 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

// ─── Valid / Invalid Addresses ────────────────────────────────────────────
export const VALID_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
export const VALID_ADDRESS_LOWERCASE = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045';
export const INVALID_ADDRESS = '0xinvalid';
export const SHORT_ADDRESS = '0x1234';
export const EMPTY_ADDRESS = '';

// ─── Mock API Responses ──────────────────────────────────────────────────
export const MOCK_META = {
  universe: [
    { name: 'BTC', szDecimals: 5, maxLeverage: 50 },
    { name: 'ETH', szDecimals: 4, maxLeverage: 50 },
    { name: 'SOL', szDecimals: 2, maxLeverage: 25 },
  ],
};

export const MOCK_SPOT_META = {
  universe: [
    { name: 'PURR/USDC', index: 1 },
    { name: 'HYPE/USDC', index: 2 },
  ],
};

export const MOCK_DEX_META = {
  universe: [
    { name: 'xyz:TSLA', szDecimals: 2, maxLeverage: 20 },
    { name: 'xyz:CL', szDecimals: 3, maxLeverage: 20 },
    { name: 'xyz:GOLD', szDecimals: 2, maxLeverage: 20 },
  ],
};

export const MOCK_PERP_DEXS = [
  null,
  { name: 'xyz' },
  { name: 'abc' },
];

export const MOCK_ALL_MIDS = {
  BTC: '70000.0',
  ETH: '3500.0',
  SOL: '150.0',
};

export const MOCK_META_AND_CTXS = [
  MOCK_META,
  [
    { funding: '0.0001', openInterest: '1000000', midPx: '70000.0' },
    { funding: '0.00005', openInterest: '500000', midPx: '3500.0' },
    { funding: '0.0002', openInterest: '200000', midPx: '150.0' },
  ],
];

export const MOCK_ORDERBOOK = {
  levels: [
    [
      { px: '69999.0', sz: '0.5', n: 3 },
      { px: '69998.0', sz: '1.2', n: 5 },
    ],
    [
      { px: '70001.0', sz: '0.8', n: 2 },
      { px: '70002.0', sz: '2.0', n: 4 },
    ],
  ],
};

export const MOCK_CANDLES = [
  { t: 1700000000000, T: 1700003600000, o: '69000', h: '70000', l: '68500', c: '69500', v: '1000', n: 500 },
  { t: 1700003600000, T: 1700007200000, o: '69500', h: '70500', l: '69000', c: '70000', v: '1200', n: 600 },
];

export const MOCK_FUNDING = [
  { coin: 'BTC', fundingRate: '0.0001', premium: '0.0002', time: 1700000000000 },
  { coin: 'BTC', fundingRate: '0.00015', premium: '0.00025', time: 1700003600000 },
];

export const MOCK_TRADES = [
  { coin: 'BTC', side: 'B', px: '70000', sz: '0.1', time: 1700000000000 },
  { coin: 'BTC', side: 'A', px: '69999', sz: '0.5', time: 1700000001000 },
];

export const MOCK_CLEARINGHOUSE_STATE = {
  marginSummary: {
    accountValue: '50000.00',
    totalMarginUsed: '10000.00',
    totalNtlPos: '25000.00',
    totalRawUsd: '50000.00',
  },
  crossMarginSummary: {
    accountValue: '50000.00',
    totalMarginUsed: '10000.00',
  },
  assetPositions: [],
};

// ─── Helper to create mock fetch ──────────────────────────────────────────
export function createMockFetch(responseData: unknown, status = 200) {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(responseData),
    text: () => Promise.resolve(JSON.stringify(responseData)),
  });
}
