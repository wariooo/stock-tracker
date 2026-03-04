import { NextRequest, NextResponse } from "next/server";
import { readFilings, readPositions } from "@/lib/data-store";
import { buildPositionHistory } from "@/lib/analysis";
import { getPriceHistory, searchTicker } from "@/lib/yahoo";
import { isValidCik, DEFAULT_CIK } from "@/lib/entities";
import { isValidTicker, isValidPeriod } from "@/lib/validate";
import type { StockDetail } from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;

  if (!isValidTicker(ticker)) {
    return NextResponse.json({ error: "Invalid ticker format" }, { status: 400 });
  }

  const periodParam = request.nextUrl.searchParams.get("period") || "1m";
  if (!isValidPeriod(periodParam)) {
    return NextResponse.json({ error: "Invalid period. Must be one of: 1w, 1m, 6m, 1y" }, { status: 400 });
  }
  const period = periodParam;

  const cik = request.nextUrl.searchParams.get("cik") || DEFAULT_CIK;
  if (!isValidCik(cik)) {
    return NextResponse.json({ error: "Invalid CIK" }, { status: 400 });
  }

  const cusipParam = request.nextUrl.searchParams.get("cusip") || "";

  const filings = await readFilings(cik);

  // Read all position files in parallel
  const positionEntries = await Promise.all(
    filings.map(async (f) => [f.accession, await readPositions(cik, f.accession)] as const)
  );
  const positionsByAccession = new Map(positionEntries);

  // Find the cusip/issuer for this ticker
  let cusip = cusipParam;
  let issuer = "";

  if (cusip) {
    for (const positions of positionsByAccession.values()) {
      const match = positions.find((p) => !p.putCall && p.cusip === cusip);
      if (match) {
        issuer = match.issuer;
        break;
      }
    }
  }

  // Fallback: resolve ticker for each unique position to find a match
  if (!issuer) {
    const seen = new Set<string>();
    for (const positions of positionsByAccession.values()) {
      for (const p of positions) {
        if (p.putCall) continue;
        const key = `${p.cusip}|${p.issuer}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const resolved = await searchTicker(p.issuer, p.cusip);
        if (resolved && resolved.toUpperCase() === ticker.toUpperCase()) {
          cusip = p.cusip;
          issuer = p.issuer;
          break;
        }
      }
      if (issuer) break;
    }
  }

  const history = buildPositionHistory(filings, positionsByAccession, cusip, issuer);
  const prices = await getPriceHistory(ticker, period);

  return NextResponse.json<StockDetail>({
    ticker,
    issuer,
    cusip,
    history,
    prices,
  });
}
