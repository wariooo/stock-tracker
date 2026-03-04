import crypto from "crypto";
import * as cheerio from "cheerio";
import type { CongressTrade, CongressChamber, TradeType } from "./types";
import { writeCongressTrades, writeCongressMeta } from "./data-store";

const BASE_URL = "https://www.capitoltrades.com/trades";

function normalizeTradeType(raw: string): TradeType {
  const lower = raw.toLowerCase().trim();
  if (lower.includes("buy") || lower.includes("purchase")) return "purchase";
  if (lower.includes("sale") && lower.includes("full")) return "sale_full";
  if (lower.includes("sale") && lower.includes("partial")) return "sale_partial";
  if (lower.includes("sell") || lower.includes("sale")) return "sale";
  if (lower.includes("exchange")) return "exchange";
  return "purchase";
}

function makeId(member: string, date: string, ticker: string | null, type: string): string {
  const raw = `${member}|${date}|${ticker ?? ""}|${type}`;
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

function cleanTicker(ticker: string | null | undefined): string | null {
  if (!ticker || ticker === "--" || ticker === "N/A" || ticker === "") return null;
  let cleaned = ticker.trim();
  // Strip ":US" suffix from Capitol Trades tickers
  cleaned = cleaned.replace(/:US$/i, "");
  cleaned = cleaned.replace(/[^A-Za-z0-9.\-]/g, "");
  return cleaned || null;
}

function parseDate(raw: string): string {
  // Capitol Trades dates look like "24 Feb2026" or "24 Feb 2026"
  const cleaned = raw.trim().replace(/([A-Za-z])(\d)/g, "$1 $2");
  const d = new Date(cleaned);
  if (isNaN(d.getTime())) return raw.trim();
  return d.toISOString().split("T")[0];
}

function parseChamber(text: string): CongressChamber {
  const lower = text.toLowerCase();
  if (lower.includes("senate")) return "senate";
  return "house";
}

export async function fetchCapitolTrades(pages = 3): Promise<CongressTrade[]> {
  const trades: CongressTrade[] = [];
  const seen = new Set<string>();

  for (let page = 1; page <= pages; page++) {
    const url = `${BASE_URL}?page=${page}&pageSize=96`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; stock-tracker/1.0)",
        Accept: "text/html",
      },
    });

    if (!res.ok) {
      console.error(`Capitol Trades page ${page} failed: ${res.status}`);
      break;
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const rows = $("table tbody tr");
    if (rows.length === 0) break;

    rows.each((_, row) => {
      const tds = $(row).find("td");
      if (tds.length < 8) return;

      // Politician name and chamber
      const memberEl = $(tds[0]);
      const name = memberEl.find(".politician-name a, a h3").first().text().trim()
        || memberEl.find("a").first().text().trim();
      if (!name) return;

      const chamberText = memberEl.html() || "";
      const chamber = parseChamber(chamberText);

      // Issuer and ticker
      const issuerEl = $(tds[1]);
      const company = issuerEl.find(".issuer-name a, a").first().text().trim()
        || issuerEl.text().trim();
      const tickerRaw = issuerEl.find(".issuer-ticker").text().trim()
        || issuerEl.find("[class*='ticker']").text().trim();
      const ticker = cleanTicker(tickerRaw);

      // Transaction date
      const dateText = $(tds[3]).text().trim();
      const transactionDate = parseDate(dateText);

      // Trade type
      const typeEl = $(tds[6]);
      const typeClass = typeEl.find("[class*='tx-type--']").attr("class") || "";
      const typeText = typeEl.text().trim();
      const tradeType = normalizeTradeType(typeClass || typeText);

      // Amount
      const amount = $(tds[7]).find(".trade-size").text().trim()
        || $(tds[7]).text().trim();

      const id = makeId(name, transactionDate, ticker, tradeType);
      if (seen.has(id)) return;
      seen.add(id);

      trades.push({
        id,
        member: name,
        chamber,
        ticker,
        assetDescription: company,
        assetType: "Stock",
        tradeType,
        amount: amount || "",
        transactionDate,
        disclosureDate: "",
        owner: "",
        currentPrice: null,
        priceChange1M: null,
      });
    });
  }

  return trades;
}

export async function pollCongressTrades(): Promise<{ house: number; senate: number }> {
  const allTrades = await fetchCapitolTrades(3);

  const houseTrades = allTrades.filter((t) => t.chamber === "house");
  const senateTrades = allTrades.filter((t) => t.chamber === "senate");

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
