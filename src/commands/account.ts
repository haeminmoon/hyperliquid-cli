import { Command } from 'commander';
import { createAuthClient } from './_helpers';
import { output, getOutputFormat } from '../output/formatter';
import { handleError } from '../output/error';

export function registerAccountCommands(program: Command): void {
  const accountCmd = program
    .command('account')
    .description('Account information');

  // account state
  accountCmd
    .command('state')
    .description('Get clearinghouse state (positions + margin)')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (options) => {
      try {
        const client = createAuthClient();
        const data = await client.getClearinghouseState();
        output(data, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

  // account spot
  accountCmd
    .command('spot')
    .description('Get spot token balances')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (options) => {
      try {
        const client = createAuthClient();
        const data = (await client.getSpotClearinghouseState()) as {
          balances: Array<{ coin: string; token: number; hold: string; total: string }>;
        };

        if (getOutputFormat(options) === 'json') {
          output(data, 'json');
          return;
        }

        if (data.balances.length === 0) {
          console.log('No spot balances.');
          return;
        }

        console.table(
          data.balances.map((b) => ({
            coin: b.coin,
            total: b.total,
            hold: b.hold,
            available: (parseFloat(b.total) - parseFloat(b.hold)).toString(),
          })),
        );
      } catch (err) {
        handleError(err);
      }
    });

  // account portfolio
  accountCmd
    .command('portfolio')
    .description('Get portfolio summary')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (options) => {
      try {
        const client = createAuthClient();
        const data = await client.getPortfolio();
        output(data, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

  // account fees
  accountCmd
    .command('fees')
    .description('Get fee schedule')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (options) => {
      try {
        const client = createAuthClient();
        const data = await client.getUserFees();
        output(data, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

  // account rate-limit
  accountCmd
    .command('rate-limit')
    .description('Get current rate limit status')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (options) => {
      try {
        const client = createAuthClient();
        const data = await client.getUserRateLimit();
        output(data, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

  // account sub-accounts
  accountCmd
    .command('sub-accounts')
    .description('List sub-accounts')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (options) => {
      try {
        const client = createAuthClient();
        const data = await client.getSubAccounts();
        output(data, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

  // account referral
  accountCmd
    .command('referral')
    .description('Get referral information')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (options) => {
      try {
        const client = createAuthClient();
        const data = await client.getReferral();
        output(data, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

  // account role
  accountCmd
    .command('role')
    .description('Get user role')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (options) => {
      try {
        const client = createAuthClient();
        const data = await client.getUserRole();
        output(data, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });
}
