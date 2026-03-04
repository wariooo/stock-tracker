import crypto from "crypto";
import type { CongressTrade, CongressChamber, TradeType } from "./types";
import { writeCongressTrades, writeCongressMeta } from "./data-store";

const HOUSE_URL =
  "https://house-stock-watcher-data.s3-us-west-2.amazonaws.com/data/all_transactions.json";
const SENATE_URL =
  "https://senate-stock-watcher-data.s3-us-west-2.amazonaws.com/data/all_transactions.json";

const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000;

function normalizeTradeType(raw: string): TradeType {
  const lower = raw.toLowerCase().trim();
  if (lower === "purchase" || lower === "buy") return "purchase";
  if (lower === "sale (full)" || lower === "sell (full)") return "sale_full";
  if (lower === "sale (partial)" || lower === "sell (partial)") return "sale_partial";
  if (lower === "sale" || lower === "sell") return "sale";
  if (lower.includes("exchange")) return "exchange";
  return "purchase";
}

function makeId(member: string, date: string, ticker: string | null, type: string): string {
  const raw = `${member}|${date}|${ticker ?? ""}|${type}`;
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

function cleanTicker(ticker: string | null | undefined): string | null {
  if (!ticker || ticker === "--" || ticker === "N/A" || ticker === "") return null;
  // Remove leading/trailing whitespace and any non-standard chars
  const cleaned = ticker.trim().replace(/[^A-Za-z0-9.\-]/g, "");
  return cleaned || null;
}

interface HouseRaw {
  representative: string;
  transaction_date: string;
  disclosure_date: string;
  ticker: string;
  asset_description: string;
  type: string;
  amount: string;
  owner: string;
}

interface SenateRaw {
  senator: string;
  transaction_date: string;
  disclosure_date: string;
  ticker: string;
  asset_description: string;
  asset_type: string;
  type: string;
  amount: string;
  owner: string;
}

export async function fetchHouseTrades(): Promise<CongressTrade[]> {
  const res = await fetch(HOUSE_URL);
  if (!res.ok) throw new Error(`House fetch failed: ${res.status}`);
  const raw: HouseRaw[] = await res.json();

  const cutoff = Date.now() - TWO_YEARS_MS;
  const trades: CongressTrade[] = [];
  const seen = new Set<string>();

  for (const r of raw) {
    const txDate = r.transaction_date;
    if (!txDate || new Date(txDate).getTime() < cutoff) continue;

    const ticker = cleanTicker(r.ticker);
    const id = makeId(r.representative, txDate, ticker, r.type);
    if (seen.has(id)) continue;
    seen.add(id);

    trades.push({
      id,
      member: r.representative || "Unknown",
      chamber: "house",
      ticker,
      assetDescription: r.asset_description || "",
      assetType: "Stock",
      tradeType: normalizeTradeType(r.type),
      amount: r.amount || "",
      transactionDate: txDate,
      disclosureDate: r.disclosure_date || "",
      owner: r.owner || "",
      currentPrice: null,
      priceChange1M: null,
    });
  }

  return trades;
}

export async function fetchSenateTrades(): Promise<CongressTrade[]> {
  const res = await fetch(SENATE_URL);
  if (!res.ok) throw new Error(`Senate fetch failed: ${res.status}`);
  const raw: SenateRaw[] = await res.json();

  const cutoff = Date.now() - TWO_YEARS_MS;
  const trades: CongressTrade[] = [];
  const seen = new Set<string>();

  for (const r of raw) {
    const txDate = r.transaction_date;
    if (!txDate || txDate === "Unknown" || new Date(txDate).getTime() < cutoff) continue;

    const ticker = cleanTicker(r.ticker);
    const id = makeId(r.senator, txDate, ticker, r.type);
    if (seen.has(id)) continue;
    seen.add(id);

    trades.push({
      id,
      member: r.senator || "Unknown",
      chamber: "senate",
      ticker,
      assetDescription: r.asset_description || "",
      assetType: r.asset_type || "Stock",
      tradeType: normalizeTradeType(r.type),
      amount: r.amount || "",
      transactionDate: txDate,
      disclosureDate: r.disclosure_date || "",
      owner: r.owner || "",
      currentPrice: null,
      priceChange1M: null,
    });
  }

  return trades;
}

export async function pollCongressTrades(): Promise<{ house: number; senate: number }> {
  const [houseTrades, senateTrades] = await Promise.all([
    fetchHouseTrades(),
    fetchSenateTrades(),
  ]);

  await Promise.all([
    writeCongressTrades("house", houseTrades),
    writeCongressTrades("senate", senateTrades),
  ]);

  await writeCongressMeta({
    lastUpdated: new Date().toISOString(),
    houseCount: houseTrades.length,
    senateCount: senateTrades.length,
  });

  return { house: houseTrades.length, senate: senateTrades.length };
}
