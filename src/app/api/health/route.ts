import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

export async function GET() {
  const results: Record<string, unknown> = {
    nodeVersion: process.version,
    timestamp: new Date().toISOString(),
  };

  // Test Yahoo Finance quote
  try {
    const yf = new YahooFinance();
    const quote = await yf.quote("AAPL");
    results.yahooQuote = {
      success: true,
      price: quote?.regularMarketPrice,
    };
  } catch (e) {
    results.yahooQuote = {
      success: false,
      error: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack?.split("\n").slice(0, 3) : undefined,
    };
  }

  // Test Yahoo Finance chart
  try {
    const yf = new YahooFinance();
    const chart = await yf.chart("AAPL", {
      period1: new Date(Date.now() - 7 * 86400000),
      interval: "1d" as const,
    });
    results.yahooChart = {
      success: true,
      quotesCount: chart?.quotes?.length ?? 0,
    };
  } catch (e) {
    results.yahooChart = {
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  // Test OpenFIGI
  try {
    const res = await fetch("https://api.openfigi.com/v3/mapping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ idType: "ID_CUSIP", idValue: "037833100" }]),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    results.openFigi = {
      success: res.ok,
      status: res.status,
      ticker: data?.[0]?.data?.[0]?.ticker ?? null,
    };
  } catch (e) {
    results.openFigi = {
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  return NextResponse.json(results);
}
