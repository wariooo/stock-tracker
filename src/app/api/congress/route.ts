import { NextRequest, NextResponse } from "next/server";
import { readCongressTrades, readCongressMeta } from "@/lib/data-store";
import type { CongressTrade, CongressTradesResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const chamber = params.get("chamber") || "all";
  const member = params.get("member") || "";
  const limit = Math.min(parseInt(params.get("limit") || "200", 10), 1000);

  let trades: CongressTrade[] = [];

  if (chamber === "all" || chamber === "house") {
    trades = trades.concat(await readCongressTrades("house"));
  }
  if (chamber === "all" || chamber === "senate") {
    trades = trades.concat(await readCongressTrades("senate"));
  }

  // Filter by member
  if (member) {
    const lowerMember = member.toLowerCase();
    trades = trades.filter((t) => t.member.toLowerCase().includes(lowerMember));
  }

  // Sort by transaction date descending
  trades.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));

  // Extract unique members before slicing
  const membersSet = new Set(trades.map((t) => t.member));
  const members = Array.from(membersSet).sort();
  const totalCount = trades.length;

  // Paginate
  trades = trades.slice(0, limit);

  const meta = await readCongressMeta();

  const response: CongressTradesResponse = {
    trades,
    totalCount,
    members,
    lastUpdated: meta?.lastUpdated ?? null,
  };

  return NextResponse.json(response);
}
