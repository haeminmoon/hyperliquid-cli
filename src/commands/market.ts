import { Command } from 'commander';
import { createPublicClient } from './_helpers';
import { output, getOutputFormat } from '../output/formatter';
import { handleError } from '../output/error';
import {
  CANDLE_INTERVALS,
  CandleInterval,
  INTERVAL_MS,
  CANDLE_MAX_PER_REQUEST,
} from '../config/constants';
import { parseIntStrict } from '../utils/helpers';
import { parseCoinDex } from '../utils/asset';

export function registerMarketCommands(program: Command): void {
  const marketCmd = program
    .command('market')
    .description('Market data queries');

  // market meta
  marketCmd
    .command('meta')
    .description('List all perpetual instruments')
    .option('--spot', 'Show spot metadata instead')
    .option('--dex <name>', 'HIP-3 dex name (e.g., xyz)')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (options) => {
      try {
        const client = createPublicClient();
        const data = options.spot
          ? await client.getSpotMeta()
          : await client.getMeta(options.dex);
        output(data, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

  // market all-mids
  marketCmd
    .command('all-mids')
    .description('Get all mid prices')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (options) => {
      try {
        const client = createPublicClient();
        const data = await client.getAllMids();
        output(data, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

  // market ticker
  marketCmd
    .command('ticker <coin>')
    .description('Get ticker data for a coin (meta + asset context). Use dex:coin format for HIP-3 (e.g., xyz:CL)')
    .option('--spot', 'Show spot ticker')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (coin: string, options) => {
      try {
        const client = createPublicClient();
        const { dex } = parseCoinDex(coin);
        const data = options.spot
          ? await client.getSpotMetaAndAssetCtxs()
          : await client.getMetaAndAssetCtxs(dex);

        const arr = data as [
          { universe: Array<{ name: string }> },
          Array<Record<string, unknown>>,
        ];
        const universe = arr[0].universe;
        const contexts = arr[1];
        const idx = universe.findIndex(
          (u) => u.name.toUpperCase() === coin.toUpperCase(),
        );

        if (idx === -1) {
          const hint = dex
            ? `Use "hyperliquid-cli market meta --dex ${dex}" to list available coins.`
            : 'Use "hyperliquid-cli market meta" to list available coins.';
          throw new Error(`Coin "${coin}" not found. ${hint}`);
        }

        const result = {
          ...universe[idx],
          ...contexts[idx],
        };
        output(result, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

  // market orderbook
  marketCmd
    .command('orderbook <coin>')
    .description('Get L2 order book')
    .option('-d, --depth <number>', 'Number of significant figures (2-5)', '5')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (coin: string, options) => {
      try {
        const client = createPublicClient();
        const { dex } = parseCoinDex(coin);
        const nSigFigs = parseIntStrict(options.depth, 'depth');
        const data = await client.getL2Book(coin, nSigFigs, undefined, dex);

        if (getOutputFormat(options) === 'json') {
          output(data, 'json');
        } else {
          const book = data as {
            levels: Array<Array<{ px: string; sz: string; n: number }>>;
          };
          console.log(`\n  Order Book: ${coin}\n`);
          console.log('  ── Asks ──');
          const asks = book.levels[1]?.slice().reverse() ?? [];
          for (const level of asks) {
            console.log(
              `  ${level.px.padStart(12)}  ${level.sz.padStart(12)}  (${level.n})`,
            );
          }
          console.log('  ─────────');
          const bids = book.levels[0] ?? [];
          for (const level of bids) {
            console.log(
              `  ${level.px.padStart(12)}  ${level.sz.padStart(12)}  (${level.n})`,
            );
          }
          console.log('  ── Bids ──\n');
        }
      } catch (err) {
        handleError(err);
      }
    });

  // market candles
  marketCmd
    .command('candles <coin>')
    .description(
      `Get OHLCV candlestick data. Up to ${CANDLE_MAX_PER_REQUEST} candles per request; use --paginate to fetch more via time-range windowing.`,
    )
    .option(
      '-i, --interval <interval>',
      `Candle interval (${CANDLE_INTERVALS.join(', ')})`,
      '1h',
    )
    .option('-n, --count <number>', 'Number of candles', '500')
    .option(
      '--paginate',
      `Auto-paginate (walk backwards by time) to fetch more than ${CANDLE_MAX_PER_REQUEST} candles`,
    )
    .option('--start-time <ms>', 'Window start (Unix ms). Overrides count-based start.')
    .option('--end-time <ms>', 'Window end (Unix ms). Defaults to now.')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (coin: string, options) => {
      try {
        if (!CANDLE_INTERVALS.includes(options.interval as CandleInterval)) {
          throw new Error(
            `Invalid interval "${options.interval}". Use: ${CANDLE_INTERVALS.join(', ')}`,
          );
        }

        const client = createPublicClient();
        const interval = options.interval as CandleInterval;
        const msPerCandle = INTERVAL_MS[interval] ?? 3600000;

        let count = parseIntStrict(options.count, 'count');
        if (count < 1) {
          throw new Error(`Invalid count: must be at least 1 (got ${count})`);
        }

        const endTime = options.endTime
          ? parseIntStrict(options.endTime, 'end-time')
          : Date.now();
        const startTime = options.startTime
          ? parseIntStrict(options.startTime, 'start-time')
          : endTime - count * msPerCandle;

        if (startTime >= endTime) {
          throw new Error('start-time must be earlier than end-time');
        }

        const { dex } = parseCoinDex(coin);

        // Clamp a too-large single request gracefully; auto-paginate instead
        // when --paginate is set.
        if (count > CANDLE_MAX_PER_REQUEST && !options.paginate) {
          console.warn(
            `Warning: count ${count} exceeds the per-request max of ${CANDLE_MAX_PER_REQUEST}. ` +
              `Clamping to ${CANDLE_MAX_PER_REQUEST}. Use --paginate to fetch more.`,
          );
          count = CANDLE_MAX_PER_REQUEST;
        }

        const data =
          options.paginate || count > CANDLE_MAX_PER_REQUEST
            ? await client.getCandleSnapshotPaginated(
                coin,
                interval,
                startTime,
                endTime,
                count,
                dex,
              )
            : await client.getCandleSnapshot(
                coin,
                interval,
                startTime,
                endTime,
                dex,
              );

        if (getOutputFormat(options) === 'json') {
          output(data, 'json');
        } else {
          const candles = data as Array<{
            t: number;
            T: number;
            o: string;
            h: string;
            l: string;
            c: string;
            v: string;
            n: number;
          }>;
          const rows = candles.map((c) => ({
            time: new Date(c.t).toISOString().slice(0, 16),
            open: c.o,
            high: c.h,
            low: c.l,
            close: c.c,
            volume: c.v,
            trades: c.n,
          }));
          console.table(rows);
        }
      } catch (err) {
        handleError(err);
      }
    });

  // market funding
  marketCmd
    .command('funding <coin>')
    .description('Get funding rate history')
    .option('--hours <number>', 'Hours to look back', '24')
    .option('--predicted', 'Show predicted funding rates instead')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (coin: string, options) => {
      try {
        const client = createPublicClient();

        if (options.predicted) {
          const data = await client.getPredictedFundings();
          output(data, getOutputFormat(options));
          return;
        }

        const { dex } = parseCoinDex(coin);
        const hours = parseIntStrict(options.hours, 'hours');
        const endTime = Date.now();
        const startTime = endTime - hours * 3600000;
        const data = await client.getFundingHistory(coin, startTime, endTime, dex);
        output(data, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });

  // market trades
  marketCmd
    .command('trades <coin>')
    .description('Get recent trades')
    .option('-o, --output <format>', 'Output format (table/json)', 'table')
    .action(async (coin: string, options) => {
      try {
        const client = createPublicClient();
        const { dex } = parseCoinDex(coin);
        const data = await client.getRecentTrades(coin, dex);
        output(data, getOutputFormat(options));
      } catch (err) {
        handleError(err);
      }
    });
}
