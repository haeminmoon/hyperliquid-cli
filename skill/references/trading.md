# Trading Reference

Detailed guide for order placement, management, and position handling on Hyperliquid.

## Order Types

### Limit Order (Gtc — Good Till Cancel)

Places an order at a specific price. Rests on the book until filled or canceled.

```bash
hyperliquid-cli order place \
  -c BTC -s buy -p 60000 -z 0.001
```

**When to use:** When you want price certainty and are willing to wait.

### Post-Only Order (Alo — Add Liquidity Only)

Guaranteed to be a maker order. Rejected if it would immediately match.

```bash
hyperliquid-cli order place \
  -c BTC -s buy -p 60000 -z 0.001 --tif Alo
```

**When to use:** When you want maker fee rates and guaranteed liquidity provision.

### IOC Order (Immediate or Cancel)

Fills whatever is available immediately, cancels the rest. Use for market-like execution.

```bash
hyperliquid-cli order place \
  -c BTC -s buy -p 999999 -z 0.001 --tif Ioc
```

**When to use:** When you want immediate execution. Set price far from market for guaranteed fill.

### Stop-Loss / Take-Profit

Trigger orders that activate when price reaches a threshold.

```bash
# Stop-loss: triggers when price drops to 60000
hyperliquid-cli order place \
  -c BTC -s sell -z 0.001 --trigger-px 60000 --tpsl sl

# Take-profit: triggers when price rises to 80000
hyperliquid-cli order place \
  -c BTC -s sell -z 0.001 --trigger-px 80000 --tpsl tp
```

**When to use:** For automated risk management.

## Time-in-Force Options

| TIF | Behavior | Use Case |
|-----|----------|----------|
| `Gtc` | Rests until filled or canceled | Default limit orders |
| `Alo` | Rejected if would take liquidity | Maker-only orders |
| `Ioc` | Fill immediately, cancel unfilled | Market-like execution |

## Position Management

### View Positions

```bash
hyperliquid-cli position list -o json
```

Returns: coin, size, entry price, mark value, unrealized PnL, liquidation price, leverage, margin used.

### Set Leverage

```bash
# Cross margin (shared across positions)
hyperliquid-cli position leverage -c BTC -l 10

# Isolated margin (per-position)
hyperliquid-cli position leverage -c BTC -l 5 --isolated
```

### Adjust Isolated Margin

```bash
# Add $100 margin to long BTC position
hyperliquid-cli position margin -c BTC -s buy -a 100

# Remove $50 margin (negative amount)
hyperliquid-cli position margin -c BTC -s buy -a -50
```

### Close a Position

Hyperliquid has no dedicated "close" command. Create an opposite order with `--reduce-only`:

```bash
# Close long: sell reduce-only IOC
hyperliquid-cli order place -c BTC -s sell -z 0.001 -p 999999 --tif Ioc --reduce-only

# Close short: buy reduce-only IOC
hyperliquid-cli order place -c BTC -s buy -z 0.001 -p 1 --tif Ioc --reduce-only
```

**Always use `--reduce-only`** to prevent accidentally opening a position in the opposite direction.

## TWAP Orders

Time-Weighted Average Price orders split a large order into smaller pieces over time.

```bash
# Buy 0.1 BTC over 30 minutes
hyperliquid-cli order twap -c BTC -s buy -z 0.1 -m 30

# Sell 1.0 ETH over 60 minutes, reduce-only
hyperliquid-cli order twap -c ETH -s sell -z 1.0 -m 60 --reduce-only

# Cancel a TWAP
hyperliquid-cli order twap-cancel -c BTC --twap-id <id>
```

TWAP options:

| Option | Required | Description |
|--------|----------|-------------|
| `-c, --coin` | Yes | Coin name |
| `-s, --side` | Yes | `buy` or `sell` |
| `-z, --size` | Yes | Total size |
| `-m, --minutes` | Yes | Duration in minutes |
| `--reduce-only` | No | Reduce only |
| `--no-randomize` | No | Disable randomization |

## Order Modification

```bash
hyperliquid-cli order modify \
  --oid 123456789 \
  -c BTC -s buy -p 61000 -z 0.002
```

Modifies an existing resting order in place. Requires the full order specification.

## Order History and Fills

```bash
# Order history (all historical orders)
hyperliquid-cli order history -o json

# Recent fills
hyperliquid-cli order fills -o json

# Fills from last 48 hours
hyperliquid-cli order fills --hours 48 -o json
```

## Dead Man Switch

Schedule a cancel-all at a future time. If the CLI doesn't heartbeat, all orders are canceled.

```bash
# Cancel all orders in 60 seconds
hyperliquid-cli order schedule-cancel --delay 60
```

Requires minimum $1M trading volume.

## Common Patterns

### Scale-In (Dollar-Cost Average)

```bash
hyperliquid-cli order place -c ETH -s buy -p 2900 -z 1.0
hyperliquid-cli order place -c ETH -s buy -p 2850 -z 1.0
hyperliquid-cli order place -c ETH -s buy -p 2800 -z 1.0
```

### Bracket Order

```bash
# Entry
hyperliquid-cli order place -c BTC -s buy -p 68000 -z 0.01
# Take-profit
hyperliquid-cli order place -c BTC -s sell -p 75000 -z 0.01 --reduce-only
# Stop-loss
hyperliquid-cli order place -c BTC -s sell -z 0.01 --trigger-px 65000 --tpsl sl
```

### Cancel Everything and Flatten

```bash
hyperliquid-cli order cancel-all
hyperliquid-cli position list -o json
# For each position, create opposite reduce-only IOC
```
