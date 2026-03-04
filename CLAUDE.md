# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

SEC 13F Stock Tracker — a Next.js app that loads 13F filings from the SEC EDGAR API, builds holdings history, computes quarter-over-quarter position changes, and displays a portfolio dashboard with price charts from Yahoo Finance.

## Commands

```bash
# Setup
npm install

# Dev server (requires SEC_USER_AGENT env var with real contact info)
export SEC_USER_AGENT="stock-tracker/1.0 (your-email@example.com)"
npm run dev                    # http://localhost:3000

# Build
npm run build
npm start
```

No test suite exists. ESLint is configured via Next.js defaults.

## Architecture

Next.js app with App Router, TypeScript, and Tailwind CSS.

### Library modules (`src/lib/`)

- **`types.ts`** — Core interfaces: `FilingMeta`, `Position`, `PortfolioRow`, `PositionHistoryEntry`, `PricePoint`, `StockDetail`, API response types.
- **`data-store.ts`** — Flat-file JSON persistence using `data/filings.json`, `data/positions/` (per-filing), and `data/cache/` (6-hour TTL).
- **`sec-client.ts`** — SEC EDGAR client. Fetches submissions JSON, finds 13F-HR filings, scrapes filing index pages with cheerio for XML info table URL, parses with fast-xml-parser. Values multiplied by 1000 on parse.
- **`analysis.ts`** — `buildPortfolioView()` compares latest 2 filings for deltas/status. `buildPositionHistory()` tracks a position across all filings.
- **`yahoo.ts`** — Ticker resolution via `yahoo-finance2` search, price history via `chart()`.
- **`format.ts`** — `fmtUsd()`, `fmtPct()`, `fmtShares()`.

### API Routes (`src/app/api/`)

- `POST /api/cron/poll-sec` — Trigger SEC EDGAR polling for CIK 0002045724 (Situational Awareness LP)
- `GET /api/portfolio` — Latest filing + positions with change detection and ticker resolution
- `GET /api/portfolio/history` — All filing metadata
- `GET /api/stock/[ticker]?period=1m` — Position history + price chart data

### Pages

- `/` — Dashboard with stat cards and sortable portfolio table (Server Component)
- `/stock/[ticker]` — Stock detail with price chart (Recharts) and position history table

### Components (`src/components/`)

- `header.tsx` — App header with "Refresh from SEC" button (Client Component)
- `portfolio-table.tsx` — Sortable portfolio table (Client Component)
- `stat-card.tsx` — Summary stat card
- `status-badge.tsx` — Color-coded NEW/EXITED/INCREASED/DECREASED/UNCHANGED badge
- `price-chart.tsx` — Recharts LineChart with period toggle (Client Component)
- `position-history.tsx` — Position history table across filings

### Data flow

`pollFilings(cik)` → writes `data/filings.json` + `data/positions/{accession}.json`
Dashboard: `readFilings()` + `readPositions()` → `buildPortfolioView()` → `searchTicker()` → render
Stock detail: `buildPositionHistory()` + `getPriceHistory()` → render

### Key conventions

- 13F values from SEC are in thousands of dollars; `sec-client.ts` multiplies by 1000 on parse.
- Options rows (`putCall` field) are excluded from the equity view in `buildPortfolioView`.
- Security identity is keyed by `issuer|cusip|putCall` (see `securityKey`).
- Ticker resolution uses an in-memory Map cache for the process lifetime.
- The app reads `SEC_USER_AGENT` from environment variables (required by SEC or 403).
