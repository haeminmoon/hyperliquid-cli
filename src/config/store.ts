import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CONFIG_DIR_NAME, CONFIG_FILE_NAME, Environment } from './constants';

export interface CliConfig {
  env: Environment;
  privateKey?: string;
  walletAddress?: string;
  subAccountAddress?: string;
}

const DEFAULT_CONFIG: CliConfig = { env: 'mainnet' };

function getConfigDir(): string {
  return path.join(os.homedir(), CONFIG_DIR_NAME);
}

function getConfigPath(): string {
  return path.join(getConfigDir(), CONFIG_FILE_NAME);
}

function ensureConfigDir(): void {
  const dir = getConfigDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { mode: 0o700, recursive: true });
  }
}

export function loadConfig(): CliConfig {
  try {
    const raw = fs.readFileSync(getConfigPath(), 'utf-8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(partial: Partial<CliConfig>): void {
  ensureConfigDir();
  const current = loadConfig();
  const merged = { ...current, ...partial };
  fs.writeFileSync(getConfigPath(), JSON.stringify(merged, null, 2), {
    mode: 0o600,
  });
}

export function getEffectiveConfig(): CliConfig {
  const disk = loadConfig();
  const envVal = process.env.HYPERLIQUID_ENV;
  const env: Environment =
    envVal === 'testnet' ? 'testnet' : disk.env;
  return {
    env,
    privateKey: disk.privateKey ?? process.env.HYPERLIQUID_WALLET_PRIVATE_KEY,
    walletAddress: disk.walletAddress ?? process.env.HYPERLIQUID_WALLET_ADDRESS,
    subAccountAddress: disk.subAccountAddress ?? process.env.HYPERLIQUID_SUB_ACCOUNT_ADDRESS,
  };
}

export function maskSecret(value: string | undefined): string {
  if (!value) return '(not set)';
  if (value.length <= 10) return '****';
  return value.slice(0, 6) + '...' + value.slice(-4);
}
