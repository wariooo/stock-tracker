import { readFilings, readPositions } from "@/lib/data-store";
import { buildPortfolioView, scoreBuyPotential } from "@/lib/analysis";
import { searchTicker, getQuote } from "@/lib/yahoo";
import { fmtUsd } from "@/lib/format";
import { Header } from "@/components/header";
import { StatCard } from "@/components/stat-card";
import { PortfolioTable } from "@/components/portfolio-table";

export const dynamic = "force-dynamic";

export default async function Home() {
  const filings = await readFilings();

  if (filings.length === 0) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-12 text-center">
          <h2 className="text-2xl font-semibold mb-4">No filings loaded</h2>
          <p className="text-muted mb-6">
            Click &quot;Refresh from SEC&quot; to fetch 13F filings from SEC
            EDGAR.
          </p>
        </main>
      </div>
    );
  }

  const latest = filings[0];
  const latestPositions = await readPositions(latest.accession);
  const previousPositions =
    filings.length > 1 ? await readPositions(filings[1].accession) : [];

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

  const positionCount = rows.length;

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard label="Latest Report Date" value={latest.reportDate} />
          <StatCard label="Positions" value={String(positionCount)} />
          <StatCard label="Total 13F Value" value={fmtUsd(totalValue)} />
        </div>
        <PortfolioTable rows={rows} />
      </main>
    </div>
  );
}
