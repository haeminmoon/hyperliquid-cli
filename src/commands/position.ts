import { Command } from 'commander';
import { createAuthClient, createPublicClient } from './_helpers';
import { output, getOutputFormat } from '../output/formatter';
import { handleError } from '../output/error';
import { parseIntStrict, parseFloatStrict } from '../utils/helpers';
import { resolveAssetIndex } from '../utils/asset';

export function registerPositionCommands(program: Command): void {
  const posCmd = program
    .command('position')
    .description('Position management');

  // position list
  posCmd
    .command('list')
    .description('List open positions')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (options) => {
      try {
        const client = createAuthClient();
        const state = (await client.getClearinghouseState()) as {
          assetPositions: Array<{
            position: {
              coin: string;
              szi: string;
              entryPx: string;
              positionValue: string;
              unrealizedPnl: string;
              liquidationPx: string | null;
              leverage: { type: string; value: number };
              marginUsed: string;
              returnOnEquity: string;
            };
          }>;
          marginSummary: Record<string, string>;
        };

        if (getOutputFormat(options) === 'json') {
          output(state, 'json');
          return;
        }

        const positions = state.assetPositions
          .filter((ap) => parseFloat(ap.position.szi) !== 0)
          .map((ap) => ({
            coin: ap.position.coin,
            size: ap.position.szi,
            entryPx: ap.position.entryPx,
            markValue: ap.position.positionValue,
            uPnL: ap.position.unrealizedPnl,
            liqPx: ap.position.liquidationPx ?? '-',
            leverage: `${ap.position.leverage.value}x ${ap.position.leverage.type}`,
            margin: ap.position.marginUsed,
            ROE: ap.position.returnOnEquity,
          }));

        if (positions.length === 0) {
          console.log('No open positions.');
          return;
        }

        console.log(`\n  Margin Summary`);
        output(state.marginSummary, 'table');
        console.log();
        console.table(positions);
      } catch (err) {
        handleError(err);
      }
    });

  // position leverage
  posCmd
    .command('leverage')
    .description('Update leverage for an asset')
    .requiredOption('-c, --coin <coin>', 'Coin/asset name')
    .requiredOption('-l, --leverage <value>', 'Leverage value')
    .option('--isolated', 'Use isolated margin (default: cross)')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (options) => {
      try {
        const pubClient = createPublicClient();
        const asset = await resolveAssetIndex(options.coin, pubClient);
        const client = createAuthClient();

        const result = await client.updateLeverage(
          asset,
          !options.isolated,
          parseIntStrict(options.leverage, 'leverage'),
        );
        output(result, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

  // position margin
  posCmd
    .command('margin')
    .description('Update isolated margin for a position')
    .requiredOption('-c, --coin <coin>', 'Coin/asset name')
    .requiredOption('-s, --side <side>', 'Position side (buy/sell)')
    .requiredOption('-a, --amount <usd>', 'USD amount to add/remove')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (options) => {
      try {
        const pubClient = createPublicClient();
        const asset = await resolveAssetIndex(options.coin, pubClient);
        const client = createAuthClient();

        const isBuy = options.side.toLowerCase() === 'buy';
        // ntli is in 6-decimal precision (1000000 = 1 USD)
        const ntli = Math.round(parseFloatStrict(options.amount, 'amount') * 1e6);

        const result = await client.updateIsolatedMargin(asset, isBuy, ntli);
        output(result, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });
}
