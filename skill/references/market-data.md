# Market Data Reference

All market data commands are public and do not require authentication.

## Instruments

Hyperliquid offers 200+ perpetual instruments and spot tokens.

### List All Instruments

```bash
# Perpetuals
hyperliquid-cli market meta -o json

# Spot
hyperliquid-cli market meta --spot -o json
```

Response includes for each instrument:
- `name` — Coin name (e.g., `BTC`, `ETH`)
- `szDecimals` — Size decimal precision
- `maxLeverage` — Maximum allowed leverage

### Asset Index

Internally, Hyperliquid uses numeric indices:
- **Perpetuals**: Index in the `universe` array (BTC=0, ETH=1, ...)
- **Spot**: `10000 + index` in spot universe

The CLI resolves coin names to indices automatically.

## Ticker

Get comprehensive market data for a single coin:

```bash
hyperliquid-cli market ticker BTC -o json
```

Returns:
- `markPx` — Current mark price
- `midPx` — Mid price (best bid + best ask / 2)
- `oraclePx` — Oracle price
- `funding` — Current funding rate
- `openInterest` — Total open interest
- `dayNtlVlm` — 24h notional volume
- `prevDayPx` — Previous day price
- `premium` — Premium to oracle
- `impactPxs` — Impact bid/ask prices

For spot:
```bash
hyperliquid-cli market ticker BTC --spot -o json
```

## All Mid Prices

Get mid prices for all instruments at once:

```bash
hyperliquid-cli market all-mids -o json
```

Returns a map of coin name to mid price string.

## Order Book

L2 order book with price levels:

```bash
# Default (5 sig figs)
hyperliquid-cli market orderbook BTC -o json

# 3 significant figures (wider levels)
hyperliquid-cli market orderbook BTC -d 3 -o json
```

JSON response contains `levels`:
- `levels[0]` — Bids (best bid first)
- `levels[1]` — Asks (best ask first)

Each level: `{ px, sz, n }` (price, size, count)

Table output shows a formatted order book with asks on top, bids on bottom.

## Candles (OHLCV)

Historical candlestick data:

```bash
# 1-hour candles, last 50
hyperliquid-cli market candles BTC -i 1h -n 50 -o json

# 15-minute candles, last 100
hyperliquid-cli market candles BTC -i 15m -n 100 -o json
```

Available intervals: `1m`, `3m`, `5m`, `15m`, `30m`, `1h`, `2h`, `4h`, `8h`, `12h`, `1d`, `3d`, `1w`, `1M`

Each candle: `{ t, T, o, h, l, c, v, n }` (open time, close time, OHLCV, trade count)

## Funding Rates

### Historical Funding

```bash
# Last 24 hours
hyperliquid-cli market funding BTC --hours 24 -o json

# Last 7 days
hyperliquid-cli market funding BTC --hours 168 -o json
```

### Predicted Funding

```bash
hyperliquid-cli market funding BTC --predicted -o json
```

### Funding Rate Interpretation

| Rate | Direction | Meaning |
|------|-----------|---------|
| Positive | Longs pay shorts | Market is bullish (premium) |
| Negative | Shorts pay longs | Market is bearish (discount) |
| High absolute value | Strong directional bias | Potential contrarian opportunity |
| Near zero | Balanced market | No significant funding opportunity |

Funding is settled every 8 hours. Payment = position size * funding rate * mark price.

## Recent Trades

```bash
hyperliquid-cli market trades BTC -o json
```

Returns recent trades with timestamp, price, size, and side.
