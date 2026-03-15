import { Command } from 'commander';
import { createAuthClient, createPublicClient } from './_helpers';
import { OrderRequest, OrderType } from '../client/api-client';
import { output, getOutputFormat } from '../output/formatter';
import { handleError } from '../output/error';
import { parseIntStrict } from '../utils/helpers';
import { resolveAssetIndex } from '../utils/asset';

function buildOrderType(options: {
  tif?: string;
  triggerPx?: string;
  tpsl?: string;
}): OrderType {
  if (options.triggerPx) {
    return {
      trigger: {
        triggerPx: options.triggerPx,
        isMarket: true,
        tpsl: (options.tpsl as 'tp' | 'sl') ?? 'sl',
      },
    };
  }

  const tif = (options.tif ?? 'Gtc') as 'Gtc' | 'Alo' | 'Ioc';
  return { limit: { tif } };
}

export function registerOrderCommands(program: Command): void {
  const orderCmd = program
    .command('order')
    .description('Order management');

  // order place
  orderCmd
    .command('place')
    .description('Place an order')
    .requiredOption('-c, --coin <coin>', 'Coin/asset name (e.g., BTC, ETH)')
    .requiredOption('-s, --side <side>', 'Order side (buy/sell)')
    .requiredOption('-z, --size <size>', 'Order size')
    .requiredOption('-p, --price <price>', 'Order price')
    .option('--tif <tif>', 'Time in force: Gtc, Alo (post-only), Ioc', 'Gtc')
    .option('--reduce-only', 'Reduce only order', false)
    .option('--trigger-px <price>', 'Trigger price (for stop/take-profit)')
    .option('--tpsl <type>', 'TP/SL type: tp or sl', 'sl')
    .option('--cloid <id>', 'Client order ID (128-bit hex)')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (options) => {
      try {
        const pubClient = createPublicClient();
        const asset = await resolveAssetIndex(options.coin, pubClient);
        const client = createAuthClient();

        const order: OrderRequest = {
          asset,
          isBuy: options.side.toLowerCase() === 'buy',
          price: options.price,
          size: options.size,
          reduceOnly: options.reduceOnly,
          orderType: buildOrderType(options),
          cloid: options.cloid,
        };

        const result = await client.placeOrder([order]);
        output(result, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

  // order cancel
  orderCmd
    .command('cancel')
    .description('Cancel an order by ID')
    .requiredOption('-c, --coin <coin>', 'Coin/asset name')
    .requiredOption('--oid <oid>', 'Order ID')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (options) => {
      try {
        const pubClient = createPublicClient();
        const asset = await resolveAssetIndex(options.coin, pubClient);
        const client = createAuthClient();
        const result = await client.cancelOrder([
          { asset, oid: parseIntStrict(options.oid, 'order ID') },
        ]);
        output(result, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

  // order cancel-by-cloid
  orderCmd
    .command('cancel-by-cloid')
    .description('Cancel an order by client order ID')
    .requiredOption('-c, --coin <coin>', 'Coin/asset name')
    .requiredOption('--cloid <cloid>', 'Client order ID')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (options) => {
      try {
        const pubClient = createPublicClient();
        const asset = await resolveAssetIndex(options.coin, pubClient);
        const client = createAuthClient();
        const result = await client.cancelByCloid([
          { asset, cloid: options.cloid },
        ]);
        output(result, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

  // order cancel-all
  orderCmd
    .command('cancel-all')
    .description('Cancel all open orders immediately')
    .option('-c, --coin <coin>', 'Cancel only orders for a specific coin')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (options) => {
      try {
        const client = createAuthClient();
        const orders = (await client.getOpenOrders()) as Array<{
          coin: string;
          oid: number;
        }>;

        if (orders.length === 0) {
          console.log('No open orders to cancel.');
          return;
        }

        // Filter by coin if specified
        const filtered = options.coin
          ? orders.filter(
              (o) => o.coin.toUpperCase() === options.coin.toUpperCase(),
            )
          : orders;

        if (filtered.length === 0) {
          console.log(`No open orders for ${options.coin}.`);
          return;
        }

        // Resolve asset indices for all unique coins
        const pubClient = createPublicClient();
        const uniqueCoins = [...new Set(filtered.map((o) => o.coin))];
        const coinToAsset: Record<string, number> = {};
        for (const coin of uniqueCoins) {
          coinToAsset[coin] = await resolveAssetIndex(coin, pubClient);
        }

        const cancels = filtered.map((o) => ({
          asset: coinToAsset[o.coin],
          oid: o.oid,
        }));

        const result = await client.cancelOrder(cancels);
        output(result, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

  // order schedule-cancel (dead man switch)
  orderCmd
    .command('schedule-cancel')
    .description('Schedule cancel-all at a future time (dead man switch)')
    .option('--delay <seconds>', 'Seconds from now to cancel (min 5)', '5')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (options) => {
      try {
        const client = createAuthClient();
        const delay = Math.max(5, parseIntStrict(options.delay, 'delay'));
        const cancelTime = Date.now() + delay * 1000;
        const result = await client.scheduleCancel(cancelTime);
        output(result, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

  // order modify
  orderCmd
    .command('modify')
    .description('Modify an existing order')
    .requiredOption('--oid <oid>', 'Order ID to modify')
    .requiredOption('-c, --coin <coin>', 'Coin/asset name')
    .requiredOption('-s, --side <side>', 'Order side (buy/sell)')
    .requiredOption('-z, --size <size>', 'New size')
    .requiredOption('-p, --price <price>', 'New price')
    .option('--tif <tif>', 'Time in force: Gtc, Alo, Ioc', 'Gtc')
    .option('--reduce-only', 'Reduce only', false)
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (options) => {
      try {
        const pubClient = createPublicClient();
        const asset = await resolveAssetIndex(options.coin, pubClient);
        const client = createAuthClient();
        const order: OrderRequest = {
          asset,
          isBuy: options.side.toLowerCase() === 'buy',
          price: options.price,
          size: options.size,
          reduceOnly: options.reduceOnly,
          orderType: buildOrderType(options),
        };
        const result = await client.modifyOrder(parseIntStrict(options.oid, 'order ID'), order);
        output(result, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

  // order list
  orderCmd
    .command('list')
    .description('List open orders')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (options) => {
      try {
        const client = createAuthClient();
        const data = await client.getOpenOrders();
        output(data, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

  // order get
  orderCmd
    .command('get <oid>')
    .description('Get order status by order ID or client order ID')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (oid: string, options) => {
      try {
        const client = createAuthClient();
        const orderId = /^\d+$/.test(oid) ? parseInt(oid) : oid;
        const data = await client.getOrderStatus(orderId);
        output(data, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

  // order history
  orderCmd
    .command('history')
    .description('List historical orders')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (options) => {
      try {
        const client = createAuthClient();
        const data = await client.getHistoricalOrders();
        output(data, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

  // order fills
  orderCmd
    .command('fills')
    .description('List recent fills')
    .option('--hours <number>', 'Hours to look back')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (options) => {
      try {
        const client = createAuthClient();
        let data;
        if (options.hours) {
          const hours = parseIntStrict(options.hours, 'hours');
          const startTime = Date.now() - hours * 3600000;
          data = await client.getUserFillsByTime(startTime);
        } else {
          data = await client.getUserFills();
        }
        output(data, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

  // order twap
  orderCmd
    .command('twap')
    .description('Place a TWAP order')
    .requiredOption('-c, --coin <coin>', 'Coin/asset name')
    .requiredOption('-s, --side <side>', 'Order side (buy/sell)')
    .requiredOption('-z, --size <size>', 'Total size')
    .requiredOption('-m, --minutes <minutes>', 'Duration in minutes')
    .option('--reduce-only', 'Reduce only', false)
    .option('--no-randomize', 'Disable randomization')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (options) => {
      try {
        const pubClient = createPublicClient();
        const asset = await resolveAssetIndex(options.coin, pubClient);
        const client = createAuthClient();
        const result = await client.twapOrder({
          asset,
          isBuy: options.side.toLowerCase() === 'buy',
          size: options.size,
          reduceOnly: options.reduceOnly,
          durationMinutes: parseIntStrict(options.minutes, 'minutes'),
          randomize: options.randomize !== false,
        });
        output(result, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

  // order twap-cancel
  orderCmd
    .command('twap-cancel')
    .description('Cancel a TWAP order')
    .requiredOption('-c, --coin <coin>', 'Coin/asset name')
    .requiredOption('--twap-id <id>', 'TWAP order ID')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (options) => {
      try {
        const pubClient = createPublicClient();
        const asset = await resolveAssetIndex(options.coin, pubClient);
        const client = createAuthClient();
        const result = await client.twapCancel(asset, parseIntStrict(options.twapId, 'TWAP ID'));
        output(result, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });
}
