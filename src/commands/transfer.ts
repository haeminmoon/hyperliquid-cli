import { Command } from 'commander';
import { createAuthClient } from './_helpers';
import { output, getOutputFormat } from '../output/formatter';
import { handleError } from '../output/error';
import { parseFloatStrict } from '../utils/helpers';
import { validateAddress } from '../utils/validate';

export function registerTransferCommands(program: Command): void {
  const transferCmd = program
    .command('transfer')
    .description('Transfer and withdrawal operations');

  // transfer usd-send
  transferCmd
    .command('usd-send')
    .description('Send USDC to another address on Hyperliquid')
    .requiredOption('-d, --destination <address>', 'Destination address')
    .requiredOption('-a, --amount <amount>', 'Amount of USDC to send')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (options) => {
      try {
        validateAddress(options.destination, 'destination address');
        const client = createAuthClient();
        const result = await client.usdSend(options.destination, options.amount);
        output(result, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

  // transfer spot-send
  transferCmd
    .command('spot-send')
    .description('Send a spot token to another address')
    .requiredOption('-d, --destination <address>', 'Destination address')
    .requiredOption('-t, --token <token>', 'Token (e.g., PURR:0x...)')
    .requiredOption('-a, --amount <amount>', 'Amount to send')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (options) => {
      try {
        validateAddress(options.destination, 'destination address');
        const client = createAuthClient();
        const result = await client.spotSend(
          options.destination,
          options.token,
          options.amount,
        );
        output(result, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

  // transfer withdraw
  transferCmd
    .command('withdraw')
    .description('Withdraw USDC to Arbitrum (~5 min, $1 fee)')
    .requiredOption('-d, --destination <address>', 'Destination address on Arbitrum')
    .requiredOption('-a, --amount <amount>', 'Amount of USDC to withdraw')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (options) => {
      try {
        validateAddress(options.destination, 'destination address');
        const client = createAuthClient();
        const result = await client.withdraw(options.destination, options.amount);
        output(result, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

  // transfer spot-to-perp
  transferCmd
    .command('spot-to-perp')
    .description('Transfer USDC from spot to perpetuals account')
    .requiredOption('-a, --amount <amount>', 'Amount to transfer')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (options) => {
      try {
        const client = createAuthClient();
        const result = await client.usdClassTransfer(options.amount, true);
        output(result, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

  // transfer perp-to-spot
  transferCmd
    .command('perp-to-spot')
    .description('Transfer USDC from perpetuals to spot account')
    .requiredOption('-a, --amount <amount>', 'Amount to transfer')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (options) => {
      try {
        const client = createAuthClient();
        const result = await client.usdClassTransfer(options.amount, false);
        output(result, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

  // transfer vault-deposit
  transferCmd
    .command('vault-deposit')
    .description('Deposit USD to a vault')
    .requiredOption('-v, --vault <address>', 'Vault address')
    .requiredOption('-a, --amount <amount>', 'Amount in USD')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (options) => {
      try {
        validateAddress(options.vault, 'vault address');
        const client = createAuthClient();
        const usd = Math.round(parseFloatStrict(options.amount, 'amount') * 1e6);
        const result = await client.vaultTransfer(options.vault, true, usd);
        output(result, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

  // transfer vault-withdraw
  transferCmd
    .command('vault-withdraw')
    .description('Withdraw USD from a vault')
    .requiredOption('-v, --vault <address>', 'Vault address')
    .requiredOption('-a, --amount <amount>', 'Amount in USD')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (options) => {
      try {
        validateAddress(options.vault, 'vault address');
        const client = createAuthClient();
        const usd = Math.round(parseFloatStrict(options.amount, 'amount') * 1e6);
        const result = await client.vaultTransfer(options.vault, false, usd);
        output(result, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

  // transfer approve-agent
  transferCmd
    .command('approve-agent')
    .description('Approve an API wallet (agent) to trade on your behalf')
    .requiredOption('-a, --agent-address <address>', 'Agent wallet address')
    .option('-n, --name <name>', 'Agent name')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (options) => {
      try {
        validateAddress(options.agentAddress, 'agent address');
        const client = createAuthClient();
        const result = await client.approveAgent(
          options.agentAddress,
          options.name,
        );
        output(result, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

}
