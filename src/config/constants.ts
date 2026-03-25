export type Environment = "mainnet" | "testnet";

export const BASE_URLS: Record<Environment, string> = {
  mainnet: "https://api.hyperliquid.xyz",
  testnet: "https://api.hyperliquid-testnet.xyz",
};

export const WS_URLS: Record<Environment, string> = {
  mainnet: "wss://api.hyperliquid.xyz/ws",
  testnet: "wss://api.hyperliquid-testnet.xyz/ws",
};

export const ENV_ALIASES: Record<string, Environment> = {
  mainnet: "mainnet",
  main: "mainnet",
  prod: "mainnet",
  production: "mainnet",
  testnet: "testnet",
  test: "testnet",
};

// EIP-712 domains
export const L1_DOMAIN = {
  name: "Exchange",
  version: "1",
  chainId: 1337,
  verifyingContract: "0x0000000000000000000000000000000000000000" as const,
};

export const USER_SIGNED_ACTION_DOMAIN_MAINNET = {
  name: "HyperliquidSignTransaction",
  version: "1",
  chainId: 42161, // Arbitrum One
  verifyingContract: "0x0000000000000000000000000000000000000000" as const,
};

export const USER_SIGNED_ACTION_DOMAIN_TESTNET = {
  name: "HyperliquidSignTransaction",
  version: "1",
  chainId: 421614, // Arbitrum Sepolia
  verifyingContract: "0x0000000000000000000000000000000000000000" as const,
};

export function getUserSignedActionDomain(env: Environment) {
  return env === "mainnet"
    ? USER_SIGNED_ACTION_DOMAIN_MAINNET
    : USER_SIGNED_ACTION_DOMAIN_TESTNET;
}

export const SIGNATURE_CHAIN_ID: Record<Environment, string> = {
  mainnet: "0xa4b1",
  testnet: "0x66eee",
};

export const CONFIG_DIR_NAME = ".hyperliquid-cli";
export const CONFIG_FILE_NAME = "config.json";

export const BUILDER_ADDRESS = "0x49f9293df6c85a86dacc2677032a92d86c7bc828";
export const BUILDER_FEE = 1;
export const BUILDER_MAX_FEE_RATE = "0.1%";
export const REFERRAL_CODE = "MOON333";

export const INTERVAL_MS: Record<string, number> = {
  "1m": 60000,
  "3m": 180000,
  "5m": 300000,
  "15m": 900000,
  "30m": 1800000,
  "1h": 3600000,
  "2h": 7200000,
  "4h": 14400000,
  "8h": 28800000,
  "12h": 43200000,
  "1d": 86400000,
  "3d": 259200000,
  "1w": 604800000,
  "1M": 2592000000,
};

export const CANDLE_INTERVALS = [
  "1m",
  "3m",
  "5m",
  "15m",
  "30m",
  "1h",
  "2h",
  "4h",
  "8h",
  "12h",
  "1d",
  "3d",
  "1w",
  "1M",
] as const;

export type CandleInterval = (typeof CANDLE_INTERVALS)[number];
