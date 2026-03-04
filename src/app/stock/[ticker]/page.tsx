import Link from "next/link";
import { readFilings, readPositions } from "@/lib/data-store";
import { buildPositionHistory } from "@/lib/analysis";
import { isValidCik, DEFAULT_CIK } from "@/lib/entities";
import { PriceChart } from "@/components/price-chart";
import { PositionHistory } from "@/components/position-history";

export const dynamic = "force-dynamic";

export default async function StockPage({
  params,
  searchParams,
}: {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<{ cik?: string }>;
}) {
  const { ticker } = await params;
  const { cik: rawCik } = await searchParams;
  const cik = rawCik && isValidCik(rawCik) ? rawCik : DEFAULT_CIK;

  const filings = await readFilings(cik);
  const positionsByAccession = new Map<string, Awaited<ReturnType<typeof readPositions>>>();
  for (const f of filings) {
    positionsByAccession.set(f.accession, await readPositions(cik, f.accession));
  }

  // Find cusip/issuer by searching all positions for a ticker match
  let cusip = "";
  let issuer = "";
  for (const positions of positionsByAccession.values()) {
    for (const p of positions) {
      if (!p.putCall) {
        // Simple heuristic: check if issuer name relates to ticker
        // We'll use the URL ticker as-is and match by issuer name
        cusip = cusip || p.cusip;
        issuer = issuer || p.issuer;
      }
    }
  }

  // Try to find exact match by searching positions for the cusip passed as ticker
  // or by matching ticker in issuer name
  for (const positions of positionsByAccession.values()) {
    const match = positions.find(
      (p) =>
        !p.putCall &&
        (p.cusip === ticker ||
          p.issuer.toUpperCase().includes(ticker.toUpperCase()))
    );
    if (match) {
      cusip = match.cusip;
      issuer = match.issuer;
      break;
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
            href={`https://finance.yahoo.com/quote/${ticker}`}
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
        <div>
          <h2 className="text-lg font-semibold mb-4">Position History</h2>
          <PositionHistory entries={history} />
        </div>
      </main>
    </div>
  );
}
