"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import type { CongressTrade, CongressChamber } from "@/lib/types";
import { TradeTypeBadge } from "./trade-type-badge";

type SortKey = "member" | "chamber" | "transactionDate" | "ticker" | "assetDescription" | "tradeType" | "amount" | "currentPrice";
type ChamberFilter = "all" | CongressChamber;

interface Props {
  initialTrades: CongressTrade[];
  members: string[];
  selectedMember: string;
  selectedChamber: ChamberFilter;
}

export function CongressTradesTable({ initialTrades, members, selectedMember, selectedChamber }: Props) {
  const [trades, setTrades] = useState(initialTrades);
  const [enriching, setEnriching] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("transactionDate");
  const [sortAsc, setSortAsc] = useState(false);
  const [memberFilter, setMemberFilter] = useState(selectedMember);
  const [chamberFilter, setChamberFilter] = useState<ChamberFilter>(selectedChamber);

  // Client-side price enrichment
  useEffect(() => {
    const tickers = Array.from(new Set(
      initialTrades.map((t) => t.ticker).filter((t): t is string => t !== null && t.length > 0)
    ));

    if (tickers.length === 0) return;
    setEnriching(true);

    async function enrichAll() {
      const priceMap: Record<string, { price: number | null; priceChange1M: number | null }> = {};

      // Batch in groups of 20
      for (let i = 0; i < tickers.length; i += 20) {
        const batch = tickers.slice(i, i + 20);
        try {
          const res = await fetch(`/api/congress/enrich?tickers=${batch.join(",")}`);
          const data = await res.json();
          Object.assign(priceMap, data);
        } catch {
          // skip failed batch
        }
      }

      setTrades((prev) =>
        prev.map((t) => {
          if (!t.ticker || !priceMap[t.ticker]) return t;
          return {
            ...t,
            currentPrice: priceMap[t.ticker].price,
            priceChange1M: priceMap[t.ticker].priceChange1M,
          };
        })
      );
      setEnriching(false);
    }

    enrichAll();
  }, [initialTrades]);

  const filtered = useMemo(() => {
    let result = trades;
    if (memberFilter) {
      const lower = memberFilter.toLowerCase();
      result = result.filter((t) => t.member.toLowerCase().includes(lower));
    }
    if (chamberFilter !== "all") {
      result = result.filter((t) => t.chamber === chamberFilter);
    }
    return result;
  }, [trades, memberFilter, chamberFilter]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === "member" || key === "ticker");
    }
  }

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "member":
        cmp = a.member.localeCompare(b.member);
        break;
      case "chamber":
        cmp = a.chamber.localeCompare(b.chamber);
        break;
      case "transactionDate":
        cmp = a.transactionDate.localeCompare(b.transactionDate);
        break;
      case "ticker":
        cmp = (a.ticker || "ZZZ").localeCompare(b.ticker || "ZZZ");
        break;
      case "assetDescription":
        cmp = a.assetDescription.localeCompare(b.assetDescription);
        break;
      case "tradeType":
        cmp = a.tradeType.localeCompare(b.tradeType);
        break;
      case "amount":
        cmp = a.amount.localeCompare(b.amount);
        break;
      case "currentPrice":
        cmp = (a.currentPrice ?? 0) - (b.currentPrice ?? 0);
        break;
    }
    return sortAsc ? cmp : -cmp;
  }), [filtered, sortKey, sortAsc]);

  const th = (label: string, key: SortKey) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider cursor-pointer hover:text-foreground select-none"
      onClick={() => handleSort(key)}
    >
      {label}
      {sortKey === key && (
        <span className="ml-1">{sortAsc ? "\u25B2" : "\u25BC"}</span>
      )}
    </th>
  );

  const chambers: { label: string; value: ChamberFilter }[] = [
    { label: "All", value: "all" },
    { label: "House", value: "house" },
    { label: "Senate", value: "senate" },
  ];

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted">Chamber:</label>
          <span className="inline-flex rounded-md border border-border text-sm overflow-hidden">
            {chambers.map((c) => (
              <button
                key={c.value}
                onClick={() => setChamberFilter(c.value)}
                className={`px-3 py-1.5 ${chamberFilter === c.value ? "bg-accent text-white" : "hover:bg-gray-100"}`}
              >
                {c.label}
              </button>
            ))}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted">Member:</label>
          <input
            type="text"
            list="member-list"
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value)}
            placeholder="Filter by name..."
            className="text-sm border border-border rounded px-2 py-1.5 bg-transparent focus:outline-none focus:border-accent w-64"
          />
          <datalist id="member-list">
            {members.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          {memberFilter && (
            <button
              onClick={() => setMemberFilter("")}
              className="text-xs text-muted hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
        <span className="text-sm text-muted ml-auto">
          {sorted.length.toLocaleString()} trades
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border bg-card-bg shadow-sm">
        {enriching && (
          <div className="px-4 py-2 text-xs text-muted bg-blue-50 border-b border-border">
            Loading price data...
          </div>
        )}
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-gray-50">
            <tr>
              {th("Member", "member")}
              {th("Chamber", "chamber")}
              {th("Trade Date", "transactionDate")}
              {th("Ticker", "ticker")}
              {th("Asset", "assetDescription")}
              {th("Type", "tradeType")}
              {th("Amount", "amount")}
              {th("Price", "currentPrice")}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted">
                  No trades found
                </td>
              </tr>
            ) : (
              sorted.map((trade) => (
                <tr key={trade.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{trade.member}</td>
                  <td className="px-4 py-3 text-sm capitalize">{trade.chamber}</td>
                  <td className="px-4 py-3 text-sm font-mono">{trade.transactionDate}</td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {trade.ticker ? (
                      <Link
                        href={`/stock/${encodeURIComponent(trade.ticker)}`}
                        className="text-accent hover:underline"
                      >
                        {trade.ticker}
                      </Link>
                    ) : (
                      <span className="text-muted">--</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm max-w-xs truncate" title={trade.assetDescription}>
                    {trade.assetDescription}
                  </td>
                  <td className="px-4 py-3">
                    <TradeTypeBadge type={trade.tradeType} />
                  </td>
                  <td className="px-4 py-3 text-sm">{trade.amount}</td>
                  <td className="px-4 py-3 text-sm font-mono">
                    {trade.currentPrice != null ? (
                      <div>
                        <span>${trade.currentPrice.toFixed(2)}</span>
                        {trade.priceChange1M != null && (
                          <span className={`ml-2 text-xs ${trade.priceChange1M >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {trade.priceChange1M >= 0 ? "+" : ""}
                            {(trade.priceChange1M * 100).toFixed(1)}%
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted">--</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
