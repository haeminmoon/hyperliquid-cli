# Account & Transfers Reference

Account management, transfers, and configuration for Hyperliquid CLI.

## Account State

### Clearinghouse State

Full account state including positions, margin, and balances:

```bash
hyperliquid-cli account state -o json
```

Returns:
- `marginSummary` — Account value, total margin used, withdrawable
- `crossMarginSummary` — Cross margin details
- `assetPositions` — All open positions with entry price, PnL, liquidation price

### Spot Balances

```bash
hyperliquid-cli account spot -o json
```

Returns token balances including hold amounts.

### Portfolio Summary

```bash
hyperliquid-cli account portfolio -o json
```

Aggregated portfolio view.

### Fee Schedule

```bash
hyperliquid-cli account fees -o json
```

Returns:
- Current fee tier
- Maker/taker fee rates
- 14-day trailing volume
- Referral discount (if applicable)

### Rate Limit Status

```bash
hyperliquid-cli account rate-limit -o json
```

Returns cumulative volume and rate limit usage.

### Sub-Accounts

```bash
hyperliquid-cli account sub-accounts -o json
```

Lists all sub-accounts under the current wallet.

### Referral Info

```bash
hyperliquid-cli account referral -o json
```

Shows referral code, referee info, and earned rebates.

### User Role

```bash
hyperliquid-cli account role -o json
```

Returns the user's role on the exchange.

## Transfers

All transfer commands require authentication.

### Send USDC on Hyperliquid

```bash
hyperliquid-cli transfer usd-send -d <destination-address> -a <amount>
```

Instant, free transfer between Hyperliquid wallets.

### Send Spot Tokens

```bash
hyperliquid-cli transfer spot-send -d <destination-address> -t <token> -a <amount>
```

Transfer spot tokens to another Hyperliquid wallet.

### Withdraw to Arbitrum

```bash
hyperliquid-cli transfer withdraw -d <destination-address> -a <amount>
```

Withdraw USDC to an Arbitrum address. Takes ~5 minutes, $1 fee.

### Internal Transfers (Spot ↔ Perp)

```bash
# Move USDC from spot to perp account
hyperliquid-cli transfer spot-to-perp -a <amount>

# Move USDC from perp to spot account
hyperliquid-cli transfer perp-to-spot -a <amount>
```

### Vault Operations

```bash
# Deposit to a vault
hyperliquid-cli transfer vault-deposit -v <vault-address> -a <amount>

# Withdraw from a vault
hyperliquid-cli transfer vault-withdraw -v <vault-address> -a <amount>
```

### Approve API Agent

```bash
hyperliquid-cli transfer approve-agent -a <agent-address>
```

Grants an agent address permission to trade on your behalf.

## Configuration

### Interactive Setup

```bash
hyperliquid-cli config init
```

Prompts for:
1. **Environment** — `mainnet` or `testnet`
2. **Private key** — Hex private key (input masked)

Wallet address is derived automatically.

### Manual Setup

```bash
hyperliquid-cli config set --env mainnet --private-key <hex-key>
```

### View Config

```bash
# Show all config (private key masked)
hyperliquid-cli config list

# Get specific value
hyperliquid-cli config get env
```

### Config File

| Item | Detail |
|------|--------|
| Path | `~/.hyperliquid-cli/config.json` |
| Permissions | `0600` (owner read/write only) |
| Format | JSON |

### Environment Variables

Environment variables override the config file:

| Variable | Description |
|----------|-------------|
| `HYPERLIQUID_WALLET_PRIVATE_KEY` | Private key (overrides config) |
| `HYPERLIQUID_WALLET_ADDRESS` | Wallet address (overrides config) |
| `HYPERLIQUID_ENV` | `mainnet` or `testnet` (default: `mainnet`) |

## Security Best Practices

1. **Never share your private key** — It controls all funds in your wallet
2. **Use testnet first** — `hyperliquid-cli config set --env testnet`
3. **Config file is restricted** — `0600` permissions (owner only)
4. **Private key is masked in output** — Only first 6 and last 4 characters shown
5. **Use API agent wallets** — Create a dedicated trading key with `approve-agent`
6. **Environment variables for CI/CD** — Avoid writing keys to disk in ephemeral environments
