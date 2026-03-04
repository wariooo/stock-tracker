import YahooFinance from "yahoo-finance2";
import type { PricePoint } from "./types";

const yahooFinance = new YahooFinance();

const tickerCache = new Map<string, string | null>();

export async function searchTicker(
  issuerName: string
): Promise<string | null> {
  if (tickerCache.has(issuerName)) {
    return tickerCache.get(issuerName)!;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await yahooFinance.search(issuerName, {
      quotesCount: 5,
      newsCount: 0,
    });

    const quotes = result.quotes || [];
    const match = quotes.find(
      (q: Record<string, unknown>) =>
        q.quoteType === "EQUITY" && typeof q.symbol === "string"
    ) || quotes[0];

    const ticker = match?.symbol ? String(match.symbol) : null;
    tickerCache.set(issuerName, ticker);
    return ticker;
  } catch {
    tickerCache.set(issuerName, null);
    return null;
  }
}

export interface QuoteData {
  price: number | null;
  priceChange1M: number | null;
  industry: string | null;
}

export async function getQuote(ticker: string): Promise<QuoteData> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await yahooFinance.quote(ticker);
    const price = result?.regularMarketPrice ?? null;
    const prevClose = result?.regularMarketPreviousClose;

    // Get 1-month change from 52-week data or historical
    let priceChange1M: number | null = null;
    try {
      const oneMonthAgo = new Date(Date.now() - 30 * 86400000);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hist: any = await yahooFinance.chart(ticker, {
        period1: oneMonthAgo,
        interval: "1d",
      });
      const quotes = hist?.quotes || [];
      if (quotes.length > 0 && price != null) {
        const oldPrice = quotes[0].close as number;
        if (oldPrice > 0) {
          priceChange1M = (price - oldPrice) / oldPrice;
        }
      }
    } catch {
      // Fall back to no 1M change data
    }

    // Fetch industry from asset profile
    let industry: string | null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const summary: any = await yahooFinance.quoteSummary(ticker, {
        modules: ["assetProfile"],
      });
      industry = summary?.assetProfile?.industry ?? null;
    } catch {
      // Industry data not available for all tickers
    }

    return { price, priceChange1M, industry };
  } catch {
    return { price: null, priceChange1M: null, industry: null };
  }
}

type Period = "1w" | "1m" | "6m" | "1y";

function periodToDate(period: Period): Date {
  const now = new Date();
  switch (period) {
    case "1w":
      return new Date(now.getTime() - 7 * 86400000);
    case "1m":
      return new Date(now.getTime() - 30 * 86400000);
    case "6m":
      return new Date(now.getTime() - 180 * 86400000);
    case "1y":
      return new Date(now.getTime() - 365 * 86400000);
  }
}

export async function getPriceHistory(
  ticker: string,
  period: Period = "1m"
): Promise<PricePoint[]> {
  try {
    const startDate = periodToDate(period);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await yahooFinance.chart(ticker, {
      period1: startDate,
      interval: period === "1w" ? "1h" : "1d",
    });

    return (result.quotes || []).map((q: Record<string, unknown>) => ({
      date: new Date(q.date as string).toISOString().split("T")[0],
      close: (q.close as number) ?? 0,
    }));
  } catch {
    return [];
  }
}
