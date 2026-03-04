import Link from "next/link";
import { readFilings, readPositions } from "@/lib/data-store";
import { buildPositionHistory } from "@/lib/analysis";
import { isValidCik, DEFAULT_CIK } from "@/lib/entities";
import { searchTicker } from "@/lib/yahoo";
import { PriceChart } from "@/components/price-chart";
import { PositionHistory } from "@/components/position-history";
import { AiInsightPanel } from "@/components/ai-insight-panel";

export const dynamic = "force-dynamic";

export default async function StockPage({
  params,
  searchParams,
}: {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<{ cik?: string; cusip?: string }>;
}) {
  const { ticker } = await params;
  const { cik: rawCik, cusip: cusipParam } = await searchParams;
  const cik = rawCik && isValidCik(rawCik) ? rawCik : DEFAULT_CIK;

  const filings = await readFilings(cik);
  const positionsByAccession = new Map<string, Awaited<ReturnType<typeof readPositions>>>();
  for (const f of filings) {
    positionsByAccession.set(f.accession, await readPositions(cik, f.accession));
  }

  // Find cusip/issuer for this ticker
  let cusip = cusipParam || "";
  let issuer = "";

  if (cusip) {
    // If cusip provided, find issuer by cusip
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
    // Collect unique issuer/cusip pairs from the latest filing
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

  const history = buildPositionHistory(
    filings,
    positionsByAccession,
    cusip,
    issuer
  );

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card-bg">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center gap-4">
          <Link href={`/?cik=${cik}`} className="text-accent hover:underline text-sm">
            &larr; Back
          </Link>
          <div>
            <h1 className="text-xl font-bold">{ticker}</h1>
            <p className="text-sm text-muted">{issuer}</p>
          </div>
          <a
            href={`https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-sm text-accent hover:underline"
          >
            View on Yahoo Finance &rarr;
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 space-y-8">
        <PriceChart ticker={ticker} />
        <AiInsightPanel
          type="stock"
          data={{
            ticker,
            issuer,
            history: history.map((h) => ({
              reportDate: h.reportDate,
              shares: h.shares,
              valueUsd: h.valueUsd,
              shareDelta: h.shareDelta,
              changePct: h.changePct,
            })),
          }}
        />
        <div>
          <h2 className="text-lg font-semibold mb-4">Position History</h2>
          <PositionHistory entries={history} />
        </div>
      </main>
    </div>
  );
}
