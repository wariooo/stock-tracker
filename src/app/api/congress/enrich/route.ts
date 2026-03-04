import { NextRequest, NextResponse } from "next/server";
import { getQuote } from "@/lib/yahoo";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const tickersParam = req.nextUrl.searchParams.get("tickers") || "";
  const tickers = tickersParam
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && /^[A-Za-z0-9.\-]{1,12}$/.test(t))
    .slice(0, 20);

  if (tickers.length === 0) {
    return NextResponse.json({});
  }

  const results: Record<string, { price: number | null; priceChange1M: number | null }> = {};

  await Promise.allSettled(
    tickers.map(async (ticker) => {
      const quote = await getQuote(ticker);
      results[ticker] = {
        price: quote.price,
        priceChange1M: quote.priceChange1M,
      };
    })
  );

  return NextResponse.json(results);
}
