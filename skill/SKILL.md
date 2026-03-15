---
name: hyperliquid
description: >-
  Trade perpetuals and spot on the Hyperliquid DEX via CLI or MCP server.
  Use when the user wants to: trade crypto perpetuals (BTC, ETH, SOL, and 200+ instruments),
  trade spot tokens, check prices or funding rates, view orderbooks, place limit or IOC orders,
  cancel orders, manage positions and leverage, check account balances or margin,
  view order/fill/trade history, execute TWAP orders, transfer USDC,
  or automate derivatives trading strategies.
  Hyperliquid is a high-performance onchain order book DEX with deep liquidity,
  low latency, and fully onchain settlement.
  Also available as an MCP server (hyperliquid-mcp) for Claude, Cursor, and other AI agents.
license: MIT
compatibility: >-
  Requires Node.js >= 20. Works on macOS, Linux, and Windows.
  Network access to hyperliquid.xyz required.
metadata:
  author: 2oolkit
  version: "0.1.0"
  exchange: hyperliquid
  openclaw:
    emoji: "📊"
    homepage: "https://hyperliquid.xyz"
    primaryEnv: "HL_PRIVATE_KEY"
    requires:
      bins: ["hyperliquid-cli", "hyperliquid-mcp"]
      env: ["HL_PRIVATE_KEY"]
    install:
      - id: "hyperliquid-cli-npm"
        kind: "npm"
        package: "@2oolkit/hyperliquid-cli"
        bins: ["hyperliquid-cli", "hyperliquid-mcp"]
        label: "Install hyperliquid-cli & hyperliquid-mcp via npm"
  clawdbot:
    emoji: "📊"
    homepage: "https://hyperliquid.xyz"
    primaryEnv: "HL_PRIVATE_KEY"
    requires:
      bins: ["hyperliquid-cli", "hyperliquid-mcp"]
      env: ["HL_PRIVATE_KEY"]
    install:
      - id: "hyperliquid-cli-npm"
        kind: "npm"
        package: "@2oolkit/hyperliquid-cli"
        bins: ["hyperliquid-cli"]
        label: "Install hyperliquid-cli via npm"
---

# Hyperliquid

Trade perpetuals and spot on [Hyperliquid](https://hyperliquid.xyz), a high-performance onchain order book DEX. Execute orders, manage positions, monitor markets, and automate trading strategies — via CLI or MCP server.

Hyperliquid offers 200+ perpetual instruments and spot tokens with deep liquidity, sub-second latency, and fully onchain settlement.

**Available interfaces:**
- **CLI** (`hyperliquid-cli`) — Terminal trading, scripting, automation
- **MCP Server** (`hyperliquid-mcp`) — AI agents via Model Context Protocol (Claude, Cursor, Windsurf)

## Getting Started

### Install

```bash
npm install -g @2oolkit/hyperliquid-cli
```

Verify installation:

```bash
hyperliquid-cli --version
```

### First-Time Setup

Run the interactive setup wizard:

```bash
hyperliquid-cli config init
```

You will be prompted for:

| Field | Description |
|-------|-------------|
| **Environment** | `mainnet` or `testnet` |
| **Private key** | Hex private key for signing (input masked) |

The wallet address is automatically derived from your private key. Config is saved to `~/.hyperliquid-cli/config.json` with `0600` permissions.

**Alternative: Environment Variables**

```bash
export HL_PRIVATE_KEY=<your-private-key>
export HL_WALLET_ADDRESS=<your-wallet-address>
```

**Alternative: Manual Config**

```bash
hyperliquid-cli config set --env mainnet --private-key <hex-key>
```

### Verify Setup

```bash
# Check config
hyperliquid-cli config list

# Check account balance
hyperliquid-cli account state

# Test with market data (no auth needed)
hyperliquid-cli market ticker BTC
```

## Output Format

**Always use `-o json` when parsing command output programmatically.** Table format is for human display only.

```bash
# JSON output (for agents and scripts)
hyperliquid-cli market ticker BTC -o json

# Pipe JSON to other tools
hyperliquid-cli order list -o json | jq '.[].oid'
```

All commands support `-o json`. Data goes to stdout, errors go to stderr.

## Command Reference

### Market Data (No Authentication Required)

These commands work without login. Use them for price checks, instrument discovery, and market analysis.

| Command | Description |
|---------|-------------|
| `hyperliquid-cli market meta` | List all perpetual instruments |
| `hyperliquid-cli market meta --spot` | List all spot instruments |
| `hyperliquid-cli market all-mids` | All mid prices |
| `hyperliquid-cli market ticker <coin>` | Price, volume, funding rate, open interest |
| `hyperliquid-cli market ticker <coin> --spot` | Spot ticker |
| `hyperliquid-cli market orderbook <coin>` | L2 order book |
| `hyperliquid-cli market orderbook <coin> -d 3` | Order book with 3 sig figs |
| `hyperliquid-cli market candles <coin> -i 1h -n 50` | OHLCV candles |
| `hyperliquid-cli market funding <coin> --hours 24` | Funding rate history |
| `hyperliquid-cli market funding <coin> --predicted` | Predicted funding rates |
| `hyperliquid-cli market trades <coin>` | Recent trades |

### Trading (Authentication Required)

#### Place Orders

| Command | Description |
|---------|-------------|
| `hyperliquid-cli order place -c <coin> -s buy -p <price> -z <size>` | Limit buy (Gtc) |
| `hyperliquid-cli order place -c <coin> -s sell -p <price> -z <size>` | Limit sell |
| `hyperliquid-cli order place ... --tif Ioc` | Immediate-or-cancel |
| `hyperliquid-cli order place ... --tif Alo` | Post-only (add liquidity only) |
| `hyperliquid-cli order place ... --reduce-only` | Reduce only |
| `hyperliquid-cli order place ... --trigger-px <px> --tpsl sl` | Stop-loss |
| `hyperliquid-cli order place ... --trigger-px <px> --tpsl tp` | Take-profit |

**Order place options:**

| Option | Required | Description | Default |
|--------|----------|-------------|---------|
| `-c, --coin <coin>` | Yes | Coin name (e.g., `BTC`, `ETH`) | -- |
| `-s, --side <buy\|sell>` | Yes | Order side | -- |
| `-z, --size <amount>` | Yes | Order size | -- |
| `-p, --price <price>` | Yes | Order price | -- |
| `--tif <tif>` | No | `Gtc`, `Alo` (post-only), `Ioc` | `Gtc` |
| `--reduce-only` | No | Reduce only | `false` |
| `--trigger-px <price>` | No | Trigger price for stop/TP | -- |
| `--tpsl <tp\|sl>` | No | Trigger type | `sl` |
| `--cloid <id>` | No | Client order ID (128-bit hex) | -- |

#### Manage Orders

| Command | Description |
|---------|-------------|
| `hyperliquid-cli order list` | List all open orders |
| `hyperliquid-cli order get <oid>` | Order status by ID |
| `hyperliquid-cli order cancel -c <coin> --oid <oid>` | Cancel specific order |
| `hyperliquid-cli order cancel-all` | Cancel all open orders |
| `hyperliquid-cli order cancel-all -c BTC` | Cancel all BTC orders only |
| `hyperliquid-cli order modify --oid <oid> -c <coin> -s <side> -p <price> -z <size>` | Modify order |
| `hyperliquid-cli order history` | Order history |
| `hyperliquid-cli order fills` | Recent fills |
| `hyperliquid-cli order fills --hours 48` | Fills from last 48h |

#### TWAP Orders

| Command | Description |
|---------|-------------|
| `hyperliquid-cli order twap -c <coin> -s <side> -z <size> -m <minutes>` | TWAP order |
| `hyperliquid-cli order twap-cancel -c <coin> --twap-id <id>` | Cancel TWAP |

#### Dead Man Switch

| Command | Description |
|---------|-------------|
| `hyperliquid-cli order schedule-cancel --delay <seconds>` | Schedule cancel-all |

### Positions

| Command | Description |
|---------|-------------|
| `hyperliquid-cli position list` | All open positions with margin summary |
| `hyperliquid-cli position leverage -c <coin> -l <value>` | Set cross leverage |
| `hyperliquid-cli position leverage -c <coin> -l <value> --isolated` | Set isolated leverage |
| `hyperliquid-cli position margin -c <coin> -s <side> -a <usd>` | Adjust isolated margin |

### Account

| Command | Description |
|---------|-------------|
| `hyperliquid-cli account state` | Clearinghouse state (positions + margin) |
| `hyperliquid-cli account spot` | Spot token balances |
| `hyperliquid-cli account portfolio` | Portfolio summary |
| `hyperliquid-cli account fees` | Fee schedule |
| `hyperliquid-cli account rate-limit` | Rate limit status |
| `hyperliquid-cli account sub-accounts` | List sub-accounts |
| `hyperliquid-cli account referral` | Referral info |
| `hyperliquid-cli account role` | User role |

### Transfers

| Command | Description |
|---------|-------------|
| `hyperliquid-cli transfer usd-send -d <address> -a <amount>` | Send USDC on Hyperliquid |
| `hyperliquid-cli transfer spot-send -d <address> -t <token> -a <amount>` | Send spot token |
| `hyperliquid-cli transfer withdraw -d <address> -a <amount>` | Withdraw to Arbitrum |
| `hyperliquid-cli transfer spot-to-perp -a <amount>` | Spot to perp transfer |
| `hyperliquid-cli transfer perp-to-spot -a <amount>` | Perp to spot transfer |
| `hyperliquid-cli transfer vault-deposit -v <vault> -a <amount>` | Vault deposit |
| `hyperliquid-cli transfer vault-withdraw -v <vault> -a <amount>` | Vault withdraw |
| `hyperliquid-cli transfer approve-agent -a <address>` | Approve API agent |

### Config

| Command | Description |
|---------|-------------|
| `hyperliquid-cli config init` | Interactive setup wizard |
| `hyperliquid-cli config set --env <env> --private-key <key>` | Update config |
| `hyperliquid-cli config list` | Show config (key masked) |
| `hyperliquid-cli config get <key>` | Get specific value |

## Asset Naming

Hyperliquid uses short coin names:

| Coin | Description |
|------|-------------|
| `BTC` | Bitcoin perpetual |
| `ETH` | Ethereum perpetual |
| `SOL` | Solana perpetual |
| `ARB` | Arbitrum perpetual |
| `DOGE` | Dogecoin perpetual |

Use `hyperliquid-cli market meta -o json` for the full list.

## Common Workflows

### Check Price and Place Order

```bash
# 1. Check current BTC price
hyperliquid-cli market ticker BTC -o json

# 2. Place a limit buy below current price
hyperliquid-cli order place -c BTC -s buy -p 60000 -z 0.001

# 3. Verify the order is open
hyperliquid-cli order list
```

### Close a Position

```bash
# 1. Check positions
hyperliquid-cli position list -o json

# 2. Close long → sell reduce-only IOC at a high price
hyperliquid-cli order place -c BTC -s sell -z 0.001 -p 999999 --tif Ioc --reduce-only

# 3. Close short → buy reduce-only IOC at a low price
hyperliquid-cli order place -c ETH -s buy -z 0.01 -p 1 --tif Ioc --reduce-only
```

**Always use `--reduce-only` when closing positions** to prevent accidentally opening a position in the opposite direction.

### Bracket Order (Entry + Take-Profit)

```bash
hyperliquid-cli order place -c BTC -s buy -z 0.01 -p 68000
hyperliquid-cli order place -c BTC -s sell -z 0.01 -p 75000 --reduce-only
```

### Cancel Everything

```bash
# Cancel all open orders
hyperliquid-cli order cancel-all

# Check remaining positions
hyperliquid-cli position list -o json
# For each position, create opposite reduce-only IOC order
```

### Portfolio Health Check

```bash
hyperliquid-cli account state -o json        # Margin summary
hyperliquid-cli position list -o json        # Open positions
hyperliquid-cli order list -o json           # Open orders
```

## Error Handling

Errors are written to stderr with actionable recovery instructions:

```
Error: Private key is not configured.

Try: hyperliquid-cli config init
```

| Error | Recovery |
|-------|----------|
| `Private key is not configured` | `hyperliquid-cli config init` |
| `Asset "XXX" not found` | `hyperliquid-cli market meta` |
| `Invalid leverage/order ID/amount` | Check input format |
| `Exchange API error` | Read the error detail message |

## Safety Rules

1. **Use `--reduce-only`** for all exit orders — prevents accidental position flips
2. **Check instrument specs** with `hyperliquid-cli market meta -o json` — verify size decimals
3. **Start with small sizes** when testing
4. **Never expose your private key** — stored locally with `0600` permissions, masked in output
5. **Use testnet first** — `hyperliquid-cli config set --env testnet`

## Configuration Files

| File | Path | Description |
|------|------|-------------|
| Config | `~/.hyperliquid-cli/config.json` | Environment, private key, wallet address |

Created with `0600` permissions (owner read/write only).

## Environment Variables

| Variable | Description |
|----------|-------------|
| `HL_PRIVATE_KEY` | Private key (overrides config) |
| `HL_WALLET_ADDRESS` | Wallet address (overrides config) |
| `HL_SUB_ACCOUNT_ADDRESS` | Sub-account address |

## Tips

### For AI Agents

- **Always use `-o json`** — table format cannot be reliably parsed
- Read error messages from stderr — they contain recovery commands
- Verify asset exists before placing orders with `hyperliquid-cli market meta -o json`
- Use `--reduce-only` for closing positions
- There is no single "close all positions" command — iterate over `position list` results

## Detailed References

- **[references/trading.md](references/trading.md)** — Order types, time-in-force, position management, TWAP, leverage
- **[references/market-data.md](references/market-data.md)** — Instruments, tickers, orderbooks, candles, funding rates
- **[references/account.md](references/account.md)** — Account state, transfers, config, security

## MCP Server

For AI agents that support MCP, this package also ships `hyperliquid-mcp`:

```bash
# Claude Code
claude mcp add hyperliquid-mcp -- hyperliquid-mcp

# Claude Desktop / Cursor / Windsurf — add to MCP config:
{
  "mcpServers": {
    "hyperliquid": { "command": "hyperliquid-mcp" }
  }
}
```

25 tools: `get_all_mids`, `get_meta`, `get_ticker`, `get_orderbook`, `get_candles`, `get_funding`, `get_recent_trades`, `place_order`, `cancel_order`, `list_open_orders`, `get_order_status`, `get_order_history`, `get_user_fills`, `list_positions`, `update_leverage`, `get_account_state`, `get_spot_balances`, `get_portfolio`, `get_user_fees`, `get_rate_limit`, `get_sub_accounts`, `usd_send`, `spot_send`, `withdraw`, `usd_class_transfer`.

Credentials are shared with the CLI — set up once with `hyperliquid-cli config init`.

## Resources

- **Hyperliquid**: https://hyperliquid.xyz
- **npm Package**: https://www.npmjs.com/package/@2oolkit/hyperliquid-cli
- **GitHub**: https://github.com/haeminmoon/hyperliquid-cli
- **Hyperliquid API Docs**: https://hyperliquid.gitbook.io/hyperliquid-docs
