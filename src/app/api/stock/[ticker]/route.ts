import { NextRequest, NextResponse } from "next/server";
import { readFilings, readPositions } from "@/lib/data-store";
import { buildPositionHistory } from "@/lib/analysis";
import { getPriceHistory } from "@/lib/yahoo";
import { isValidCik, DEFAULT_CIK } from "@/lib/entities";
import type { StockDetail } from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const period = (request.nextUrl.searchParams.get("period") || "1m") as
    | "1w"
    | "1m"
    | "6m"
    | "1y";
  const cik = request.nextUrl.searchParams.get("cik") || DEFAULT_CIK;
  if (!isValidCik(cik)) {
    return NextResponse.json({ error: "Invalid CIK" }, { status: 400 });
  }

  const filings = await readFilings(cik);
  const positionsByAccession = new Map<string, Awaited<ReturnType<typeof readPositions>>>();
  for (const f of filings) {
    positionsByAccession.set(f.accession, await readPositions(cik, f.accession));
  }

  // Find the cusip/issuer for this ticker by searching latest positions
  let cusip = "";
  let issuer = "";
  for (const positions of positionsByAccession.values()) {
    const match = positions.find(
      (p) => p.issuer.toLowerCase().includes(ticker.toLowerCase()) || p.cusip === ticker
    );
    if (match) {
      cusip = match.cusip;
      issuer = match.issuer;
      break;
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
