# Hyperliquid CLI

CLI & MCP server for Hyperliquid DEX — trade perpetuals & spot, manage orders, and query market data.

## Project Overview

- **Name**: `@2oolkit/hyperliquid-cli`
- **Language**: TypeScript (CommonJS)
- **CLI Framework**: Commander.js
- **MCP Framework**: @modelcontextprotocol/sdk
- **Node**: >= 20
- **Build**: tsup (two entry points: `index.ts` → CLI, `mcp.ts` → MCP server)

## Architecture

```
src/
├── index.ts                       # CLI entry point (Commander.js)
├── mcp.ts                         # MCP server entry point (stdio transport)
├── client/
│   └── api-client.ts              # HyperliquidClient — /info (read) + /exchange (signed) API
├── commands/                      # CLI command handlers
│   ├── _helpers.ts                # createPublicClient(), createAuthClient()
│   ├── config.ts                  # config init/set/get/list
│   ├── market.ts                  # meta, all-mids, ticker, orderbook, candles, funding, trades
│   ├── order.ts                   # place, cancel, cancel-by-cloid, cancel-all, modify, list, get, history, fills, twap, twap-cancel
│   ├── position.ts               # list, leverage, margin
│   ├── account.ts                 # state, spot, portfolio, fees, rate-limit, sub-accounts, referral, role
│   └── transfer.ts               # usd-send, spot-send, withdraw, spot-to-perp, perp-to-spot, vault-deposit/withdraw, approve-agent
├── config/
│   ├── store.ts                   # ~/.hyperliquid-cli/config.json management (loadConfig, saveConfig, getEffectiveConfig)
│   └── constants.ts               # BASE_URLS, EIP-712 domains, env vars, candle intervals, builder config
├── signing/
│   ├── phantom-agent.ts           # L1 signing: msgpack → keccak256 → EIP-712 phantom agent (orders, cancels, leverage, etc.)
│   └── user-signed-action.ts      # User signing: EIP-712 HyperliquidSignTransaction (transfers, withdrawals, agent approval, etc.)
├── output/
│   ├── formatter.ts               # output(data, 'json'|'table') — all commands support -o option
│   └── error.ts                   # ActionableError (with suggestedCommand), handleError(), requireConfig()
├── mcp/
│   ├── helpers.ts                 # mcpText(), mcpError(), createPublicClient(), createAuthClient(), withErrorHandling()
│   └── tools/                     # MCP tool registration (Zod schema validation)
│       ├── market.ts              # get_all_mids, get_meta, get_ticker, get_orderbook, get_candles, get_funding, get_recent_trades
│       ├── order.ts               # place_order, cancel_order, list_open_orders, get_order_status, get_order_history, get_user_fills
│       ├── position.ts            # list_positions, update_leverage
│       ├── account.ts             # get_account_state, get_spot_balances, get_portfolio, get_user_fees, get_rate_limit, get_sub_accounts
│       └── transfer.ts            # usd_send, spot_send, withdraw, usd_class_transfer
└── utils/
    ├── helpers.ts                 # formatNumber, removeTrailingZeros, floatToWire, floatToIntForHashing, floatToUsdInt, nowMs
    ├── asset.ts                   # resolveAssetIndex() — shared coin-to-index resolver for CLI and MCP
    └── validate.ts                # validateAddress() — Ethereum address validation
```

## Hyperliquid API Reference

- **Mainnet**: `https://api.hyperliquid.xyz`
- **Testnet**: `https://api.hyperliquid-testnet.xyz`
- **Info endpoint**: `POST /info` — read-only, no auth required, body: `{ "type": "..." }`
- **Exchange endpoint**: `POST /exchange` — signature required, body: `{ action, nonce, signature }`
- **WebSocket**: `wss://api.hyperliquid.xyz/ws`

### Signing

Two signing schemes:

| Scheme | Domain | Purpose |
|---|---|---|
| `sign_l1_action` (phantom agent) | `Exchange`, chainId=1337 | Orders, cancels, leverage, TWAP, and other trading actions |
| `sign_user_signed_action` | `HyperliquidSignTransaction`, chainId=42161(mainnet)/421614(testnet) | Transfers, withdrawals, agent approval, etc. |

**Phantom agent signing flow**: action → sort keys → msgpack encode → append nonce(8B) + vault marker(1B) → keccak256 → EIP-712 Agent{source, connectionId} signature

### Asset Index

- **Perpetuals**: Array index in `meta.universe` (BTC=0, ETH=1, ...)
- **HIP-3 perps**: Array index in dex-specific `meta.universe` with `dex` param (e.g., `xyz:CL` → dex="xyz")
- **Spot**: `10000 + index` in `spotMeta.universe`

### Candles (`/info` `candleSnapshot`)

- Body: `{ type: "candleSnapshot", req: { coin, interval, startTime, endTime }, dex? }`.
- **Returns at most `CANDLE_MAX_PER_REQUEST` (5000) candles per request** (rolling time window, no cursor).
- All 14 intervals exposed via `CANDLE_INTERVALS` / `INTERVAL_MS` (constants.ts): `1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 8h, 12h, 1d, 3d, 1w, 1M`.
- **Pagination (time-range windowing)**: to fetch more than 5000, repeat the request keeping the same `startTime` but setting `endTime = (oldest candle returned).t − 1ms`, walking backwards until the requested count is reached or history is exhausted; dedupe by open time `t` and sort ascending. Implemented in `client.getCandleSnapshotPaginated(coin, interval, startTime, endTime, maxTotal, dex?)`.
- CLI: `market candles <coin> -i <interval> -n <count>` (default `-n 500`); `--paginate` to exceed 5000; `--start-time`/`--end-time` for explicit windows. Counts >5000 without `--paginate` are clamped to 5000 with a warning. MCP `get_candles` caps `count` at 5000 per request and accepts an `endTime` arg to page backwards.

## Configuration

- **Config file path**: `~/.hyperliquid-cli/config.json` (mode 0o600)
- **Environment variables**: `HYPERLIQUID_WALLET_PRIVATE_KEY`, `HYPERLIQUID_WALLET_ADDRESS`, `HYPERLIQUID_ENV`, `HYPERLIQUID_SUB_ACCOUNT_ADDRESS`
- **Priority**: config file → environment variables

```typescript
interface CliConfig {
  env: 'mainnet' | 'testnet';
  privateKey?: string;
  walletAddress?: string;         // Auto-derived from privateKey
  subAccountAddress?: string;
}
```

## Key Dependencies

| Package | Purpose |
|---|---|
| `commander` | CLI framework |
| `ethers` | EIP-712 signing, wallet management |
| `@msgpack/msgpack` | Msgpack encoding for phantom agent hash |
| `zod` | MCP tool parameter schema validation |
| `@modelcontextprotocol/sdk` | MCP server protocol |
| `tsup` | Bundling/build |

## Commands

```bash
npm run build                    # tsup build → dist/index.js, dist/mcp.js
npm run dev                      # Run with ts-node
npm run lint                     # tsc --noEmit (note: ethers types are large, may need NODE_OPTIONS=--max-old-space-size=4096)
```

## Patterns & Conventions

- **Dual Interface**: Same API client used by both CLI (Commander.js) and MCP (Zod schemas)
- **All commands support `-o, --output <format>`** (`json` or `table`)
- **Error handling**: `ActionableError` suggests recovery commands (e.g., "Try: hyperliquid-cli config init")
- **Security**: Private key stored with 0o600 permissions, masked in output (first 6 + last 4 chars)
- **Command registration**: `registerXxxCommands(program: Command)` for each command group
- **MCP tool registration**: `registerXxxTools(server: McpServer)` for each tool group
- **Asset resolution**: `resolveAssetIndex(coin, client)` resolves coin name to index via meta endpoint
- **Input validation**: `parseIntStrict()`, `parseFloatStrict()` for numeric inputs; `validateAddress()` for Ethereum addresses

## Bin Entries

- `hyperliquid-cli` → `dist/index.js`
- `hyperliquid-mcp` → `dist/mcp.js`
