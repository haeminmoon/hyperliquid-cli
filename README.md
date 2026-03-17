# @2oolkit/hyperliquid-cli

Trade perpetuals and spot on [Hyperliquid](https://hyperliquid.xyz) — a high-performance onchain order book DEX — from your terminal or AI agent.

**One package, three interfaces:**

| Interface | Command | Use Case |
|-----------|---------|----------|
| **CLI** | `hyperliquid-cli` | Terminal trading, scripting, automation |
| **MCP Server** | `hyperliquid-mcp` | AI agents (Claude, Cursor, Windsurf, etc.) |
| **OpenClaw Skill** | [`skill/SKILL.md`](skill/SKILL.md) | AI agent ecosystem (OpenClaw, ClawdBot) |

200+ perpetual instruments, spot tokens, TWAP orders, and full account management.

## Installation

```bash
npm install -g @2oolkit/hyperliquid-cli
```

This installs both `hyperliquid-cli` (CLI) and `hyperliquid-mcp` (MCP server).

## Prerequisites

- **Node.js** >= 20
- A **Hyperliquid** wallet with funds deposited
- Your wallet's **private key** (for signing transactions)

---

## CLI Usage

### Quick Start

```bash
# 1. Interactive setup (prompts for environment, private key)
hyperliquid-cli config init

# 2. Check a price (no auth needed)
hyperliquid-cli market ticker BTC

# 3. Place a limit buy
hyperliquid-cli order place -c BTC -s buy -p 60000 -z 0.001

# 4. View open orders
hyperliquid-cli order list
```

### Configuration

**Interactive setup (recommended):**

```bash
hyperliquid-cli config init
```

Prompts for:

| Prompt | Description |
|--------|-------------|
| **Environment** | `mainnet` or `testnet` |
| **Private key** | Hex private key (input masked with `*`) |

The wallet address is automatically derived from the private key.

**Manual setup:**

```bash
hyperliquid-cli config set --env mainnet --private-key <hex-key>
```

**Environment variables (CI/CD, Docker):**

```bash
export HYPERLIQUID_WALLET_PRIVATE_KEY=<your-private-key>
export HYPERLIQUID_WALLET_ADDRESS=<your-wallet-address>
```

**View current config:**

```bash
hyperliquid-cli config list
hyperliquid-cli config get env
```

Config is saved to `~/.hyperliquid-cli/config.json` with `0600` permissions.

### Command Reference

#### Market Data (no auth required)

```bash
hyperliquid-cli market meta                        # List all perpetual instruments
hyperliquid-cli market meta --spot                 # List spot instruments
hyperliquid-cli market all-mids                    # All mid prices
hyperliquid-cli market ticker BTC                  # Price, volume, funding, OI
hyperliquid-cli market ticker BTC --spot           # Spot ticker
hyperliquid-cli market orderbook BTC               # L2 order book
hyperliquid-cli market orderbook BTC -d 3          # 3 sig figs depth
hyperliquid-cli market candles BTC -i 1h -n 50     # OHLCV candles
hyperliquid-cli market funding BTC --hours 24      # Funding rate history
hyperliquid-cli market funding BTC --predicted     # Predicted funding rates
hyperliquid-cli market trades BTC                  # Recent trades
```

#### Orders (auth required)

```bash
# Place orders
hyperliquid-cli order place -c BTC -s buy -p 60000 -z 0.001              # Limit buy (Gtc)
hyperliquid-cli order place -c BTC -s sell -p 80000 -z 0.001             # Limit sell
hyperliquid-cli order place -c BTC -s buy -p 70000 -z 0.001 --tif Ioc   # Immediate-or-cancel
hyperliquid-cli order place -c BTC -s buy -p 70000 -z 0.001 --tif Alo   # Post-only (add liquidity)
hyperliquid-cli order place -c BTC -s sell -z 0.001 --trigger-px 65000 --tpsl sl  # Stop-loss
hyperliquid-cli order place -c BTC -s sell -z 0.001 --reduce-only -p 80000        # Reduce-only

# Manage orders
hyperliquid-cli order list                                    # Open orders
hyperliquid-cli order get <oid>                               # Order status by ID
hyperliquid-cli order cancel -c BTC --oid <oid>               # Cancel one
hyperliquid-cli order cancel-all                              # Cancel all open orders
hyperliquid-cli order cancel-all -c BTC                       # Cancel all BTC orders only
hyperliquid-cli order modify --oid <oid> -c BTC -s buy -p 61000 -z 0.002  # Modify order

# History
hyperliquid-cli order history                                 # Order history
hyperliquid-cli order fills                                   # Recent fills
hyperliquid-cli order fills --hours 48                        # Fills from last 48h

# TWAP
hyperliquid-cli order twap -c BTC -s buy -z 0.1 -m 30        # TWAP over 30 minutes
hyperliquid-cli order twap-cancel -c BTC --twap-id <id>       # Cancel TWAP

# Dead man switch
hyperliquid-cli order schedule-cancel --delay 60              # Cancel all orders in 60s
```

**Order place options:**

| Option | Required | Description | Default |
|--------|----------|-------------|---------|
| `-c, --coin <coin>` | Yes | Coin name (e.g., `BTC`, `ETH`) | — |
| `-s, --side <side>` | Yes | `buy` or `sell` | — |
| `-z, --size <size>` | Yes | Order size | — |
| `-p, --price <price>` | Yes | Order price | — |
| `--tif <tif>` | No | `Gtc`, `Alo` (post-only), `Ioc` | `Gtc` |
| `--reduce-only` | No | Reduce only | `false` |
| `--trigger-px <price>` | No | Trigger price (stop/TP) | — |
| `--tpsl <type>` | No | `tp` or `sl` | `sl` |
| `--cloid <id>` | No | Client order ID (128-bit hex) | — |

#### Positions

```bash
hyperliquid-cli position list                                 # All open positions + margin
hyperliquid-cli position leverage -c BTC -l 10                # Set 10x cross leverage
hyperliquid-cli position leverage -c BTC -l 5 --isolated      # Set 5x isolated
hyperliquid-cli position margin -c BTC -s buy -a 100          # Add $100 isolated margin
```

#### Account

```bash
hyperliquid-cli account state                     # Clearinghouse state (positions + margin)
hyperliquid-cli account spot                      # Spot token balances
hyperliquid-cli account portfolio                 # Portfolio summary
hyperliquid-cli account fees                      # Fee schedule
hyperliquid-cli account rate-limit                # Rate limit status
hyperliquid-cli account sub-accounts              # Sub-accounts
hyperliquid-cli account referral                  # Referral info
hyperliquid-cli account role                      # User role
```

#### Transfers (auth required)

```bash
hyperliquid-cli transfer usd-send -d <address> -a 100          # Send USDC on Hyperliquid
hyperliquid-cli transfer spot-send -d <address> -t <token> -a 10  # Send spot token
hyperliquid-cli transfer withdraw -d <address> -a 100           # Withdraw to Arbitrum (~5 min, $1 fee)
hyperliquid-cli transfer spot-to-perp -a 100                    # Spot → Perp
hyperliquid-cli transfer perp-to-spot -a 100                    # Perp → Spot
hyperliquid-cli transfer vault-deposit -v <vault> -a 100        # Vault deposit
hyperliquid-cli transfer vault-withdraw -v <vault> -a 100       # Vault withdraw
hyperliquid-cli transfer approve-agent -a <address>             # Approve API agent
```

### Output Formats

All commands support `-o json` for scripting and piping:

```bash
hyperliquid-cli market ticker BTC -o json
hyperliquid-cli order list -o json | jq '.[].oid'
```

---

## MCP Server

The MCP (Model Context Protocol) server exposes all Hyperliquid functionality as tools for AI agents. Works with Claude Code, Claude Desktop, Cursor, Windsurf, and any MCP-compatible client.

### Setup for Claude Code

```bash
claude mcp add hyperliquid-mcp -- hyperliquid-mcp
```

### Setup for Claude Desktop / Cursor / Windsurf

Add to your MCP config file:

```json
{
  "mcpServers": {
    "hyperliquid": {
      "command": "hyperliquid-mcp"
    }
  }
}
```

Or without global install:

```json
{
  "mcpServers": {
    "hyperliquid": {
      "command": "npx",
      "args": ["-y", "-p", "@2oolkit/hyperliquid-cli", "hyperliquid-mcp"]
    }
  }
}
```

### Available Tools (25)

| Category | Tools | Auth |
|----------|-------|------|
| **Market** | `get_all_mids`, `get_meta`, `get_ticker`, `get_orderbook`, `get_candles`, `get_funding`, `get_recent_trades` | No |
| **Orders** | `place_order`, `cancel_order`, `list_open_orders`, `get_order_status`, `get_order_history`, `get_user_fills` | Yes |
| **Positions** | `list_positions`, `update_leverage` | Yes |
| **Account** | `get_account_state`, `get_spot_balances`, `get_portfolio`, `get_user_fees`, `get_rate_limit`, `get_sub_accounts` | Yes |
| **Transfers** | `usd_send`, `spot_send`, `withdraw`, `usd_class_transfer` | Yes |

### MCP Configuration

**Option 1: CLI setup (recommended)**

```bash
hyperliquid-cli config init
```

The MCP server reads the same config as the CLI (`~/.hyperliquid-cli/`).

**Option 2: Environment variables in MCP config**

Pass credentials directly in your MCP config file — no CLI setup needed:

```json
{
  "mcpServers": {
    "hyperliquid": {
      "command": "hyperliquid-mcp",
      "env": {
        "HYPERLIQUID_WALLET_PRIVATE_KEY": "0x..."
      }
    }
  }
}
```

---

## OpenClaw Skill

This package includes an [OpenClaw](https://openclaw.dev) skill definition for AI agent ecosystems. The skill file is located at [`skill/SKILL.md`](skill/SKILL.md) with detailed reference docs in `skill/references/`.

Compatible with OpenClaw, ClawdBot, and other agent skill platforms.

---

## Asset Naming

Hyperliquid uses short coin names (not trading pairs):

| Coin | Description |
|------|-------------|
| `BTC` | Bitcoin perpetual |
| `ETH` | Ethereum perpetual |
| `SOL` | Solana perpetual |
| `ARB` | Arbitrum perpetual |
| `DOGE` | Dogecoin perpetual |

Use `hyperliquid-cli market meta -o json` for the full list with size decimals and max leverage.

Spot tokens use the same names. Add `--spot` flag for spot-specific commands.

## Common Workflows

### Close a Position

```bash
# Long position → sell reduce-only at market
hyperliquid-cli order place -c BTC -s sell -z 0.001 -p 100000 --tif Ioc --reduce-only

# Short position → buy reduce-only at market
hyperliquid-cli order place -c ETH -s buy -z 0.01 -p 1 --tif Ioc --reduce-only
```

### Bracket Order (Entry + Take-Profit)

```bash
hyperliquid-cli order place -c BTC -s buy -z 0.01 -p 68000
hyperliquid-cli order place -c BTC -s sell -z 0.01 -p 75000 --reduce-only
```

### Cancel Everything

```bash
hyperliquid-cli order cancel-all
hyperliquid-cli position list -o json
# For each position, create opposite reduce-only order
```

### Portfolio Health Check

```bash
hyperliquid-cli account state -o json
hyperliquid-cli position list -o json
hyperliquid-cli order list -o json
```

## Error Handling

Errors include actionable recovery instructions:

```
Error: Private key is not configured.

Try: hyperliquid-cli config init
```

| Error | Recovery |
|-------|----------|
| `Private key is not configured` | `hyperliquid-cli config init` |
| `Asset "XXX" not found` | Check with `hyperliquid-cli market meta` |
| `Invalid leverage` | Use a valid integer |
| `Exchange API error` | Check the error message for details |

## Safety

1. **Use `--reduce-only` for exit orders** — prevents accidental position flips
2. **Check instrument specs** — `hyperliquid-cli market meta -o json` for size decimals and max leverage
3. **Start with small sizes** when testing
4. **Never expose your private key** — config file uses `0600` permissions, key is masked in output
5. **Use testnet first** — `hyperliquid-cli config set --env testnet`

## Configuration Files

| File | Path | Description |
|------|------|-------------|
| Config | `~/.hyperliquid-cli/config.json` | Environment, private key, wallet address |

Config uses `0600` permissions (owner read/write only). Private key is masked when displayed.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `HYPERLIQUID_WALLET_PRIVATE_KEY` | Private key (overrides config file) |
| `HYPERLIQUID_WALLET_ADDRESS` | Wallet address (overrides config file) |
| `HYPERLIQUID_ENV` | `mainnet` or `testnet` (default: `mainnet`) |

## Resources

- **Hyperliquid**: https://hyperliquid.xyz
- **npm Package**: https://www.npmjs.com/package/@2oolkit/hyperliquid-cli
- **GitHub**: https://github.com/haeminmoon/hyperliquid-cli
- **Hyperliquid API Docs**: https://hyperliquid.gitbook.io/hyperliquid-docs

## License

MIT
