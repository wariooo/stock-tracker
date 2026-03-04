import { readCongressTrades, readCongressMeta } from "@/lib/data-store";
import { Header } from "@/components/header";
import { StatCard } from "@/components/stat-card";
import { CongressTradesTable } from "@/components/congress-trades-table";
import type { CongressTrade } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CongressPage({
  searchParams,
}: {
  searchParams: Promise<{ member?: string; chamber?: string }>;
}) {
  const { member: memberParam, chamber: chamberParam } = await searchParams;
  const selectedMember = memberParam || "";
  const selectedChamber = (chamberParam === "house" || chamberParam === "senate") ? chamberParam : "all";

  const [houseTrades, senateTrades, meta] = await Promise.all([
    readCongressTrades("house"),
    readCongressTrades("senate"),
    readCongressMeta(),
  ]);

  const allTrades: CongressTrade[] = [...houseTrades, ...senateTrades];

  // Sort by date descending
  allTrades.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));

  // Compute stats
  const totalTrades = allTrades.length;
  const uniqueMembers = new Set(allTrades.map((t) => t.member)).size;

  // Most traded tickers
  const tickerCounts = new Map<string, number>();
  for (const t of allTrades) {
    if (t.ticker) {
      tickerCounts.set(t.ticker, (tickerCounts.get(t.ticker) || 0) + 1);
    }
  }
  const topTickers = Array.from(tickerCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t)
    .join(", ");

  // Extract members for filter dropdown
  const members = Array.from(new Set(allTrades.map((t) => t.member))).sort();

  if (totalTrades === 0) {
    return (
      <div className="min-h-screen">
        <Header activeTab="congress" />
        <main className="mx-auto max-w-7xl px-4 py-12 text-center">
          <h2 className="text-2xl font-semibold mb-4">No trades loaded</h2>
          <p className="text-muted mb-6">
            Click &quot;Refresh Congress Data&quot; to fetch trade disclosures.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header activeTab="congress" />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Trades" value={totalTrades.toLocaleString()} />
          <StatCard label="Members" value={String(uniqueMembers)} />
          <StatCard label="Top Tickers" value={topTickers || "--"} />
          <StatCard
            label="Last Updated"
            value={meta?.lastUpdated ? new Date(meta.lastUpdated).toLocaleDateString() : "Never"}
          />
        </div>
        <CongressTradesTable
          initialTrades={allTrades.slice(0, 500)}
          members={members}
          selectedMember={selectedMember}
          selectedChamber={selectedChamber}
        />
      </main>
    </div>
  );
}
