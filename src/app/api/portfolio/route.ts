import { NextRequest, NextResponse } from "next/server";
import { readFilings, readPositions } from "@/lib/data-store";
import { buildPortfolioView, scoreBuyPotential } from "@/lib/analysis";
import { searchTicker, getQuote } from "@/lib/yahoo";
import { isValidCik, DEFAULT_CIK } from "@/lib/entities";
import type { PortfolioResponse } from "@/lib/types";

export async function GET(request: NextRequest) {
  const cik = request.nextUrl.searchParams.get("cik") || DEFAULT_CIK;
  if (!isValidCik(cik)) {
    return NextResponse.json({ error: "Invalid CIK" }, { status: 400 });
  }

  const filings = await readFilings(cik);
  if (filings.length === 0) {
    return NextResponse.json<PortfolioResponse>({
      filing: null,
      rows: [],
      totalValue: 0,
      positionCount: 0,
    });
  }

  const latest = filings[0];
  const latestPositions = await readPositions(cik, latest.accession);
  const previousPositions =
    filings.length > 1 ? await readPositions(cik, filings[1].accession) : [];

  const { rows, totalValue } = buildPortfolioView(
    latestPositions,
    previousPositions
  );

  // Resolve tickers and enrich with price data
  await Promise.allSettled(
    rows.map(async (row) => {
      row.ticker = await searchTicker(row.issuer);
      if (row.ticker) {
        const quote = await getQuote(row.ticker);
        row.currentPrice = quote.price;
        row.priceChange1M = quote.priceChange1M;
        row.priceChange6M = quote.priceChange6M;
        row.priceChange1Y = quote.priceChange1Y;
        row.industry = quote.industry;
        const prevRow = previousPositions.find(
          (p) => !p.putCall && p.issuer.toUpperCase() === row.issuer.toUpperCase()
        );
        row.buyScore = scoreBuyPotential({
          priceChange1M: quote.priceChange1M,
          shareDelta: row.shareDelta,
          prevShares: prevRow?.shares ?? 0,
          status: row.status,
        });
      }
    })
  );

  return NextResponse.json<PortfolioResponse>({
    filing: latest,
    rows,
    totalValue,
    positionCount: rows.length,
  });
}
