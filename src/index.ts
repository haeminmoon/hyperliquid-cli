import { Command } from 'commander';
import { registerConfigCommands } from './commands/config';
import { registerMarketCommands } from './commands/market';
import { registerOrderCommands } from './commands/order';
import { registerPositionCommands } from './commands/position';
import { registerAccountCommands } from './commands/account';
import { registerTransferCommands } from './commands/transfer';

const program = new Command();

program
  .name('hyperliquid-cli')
  .description('CLI for Hyperliquid DEX — trade perpetuals & spot, manage orders, and query market data')
  .version('0.1.0');

// Global error handling
program.exitOverride((err) => {
  if (err.code === 'commander.helpDisplayed' || err.code === 'commander.version') {
    process.exit(0);
  }
  process.exit(1);
});

// Register command groups
registerConfigCommands(program);
registerMarketCommands(program);
registerOrderCommands(program);
registerPositionCommands(program);
registerAccountCommands(program);
registerTransferCommands(program);

program.parseAsync(process.argv).catch(() => {
  // All command actions have their own error handling via handleError().
  // This catch is only reached if Commander itself fails (e.g., unknown command).
  process.exit(1);
});
