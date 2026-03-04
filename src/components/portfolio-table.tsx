"use client";

import { useState } from "react";
import Link from "next/link";
import type { PortfolioRow } from "@/lib/types";
import { fmtUsd, fmtPct, fmtShares } from "@/lib/format";
import { StatusBadge } from "./status-badge";
import { ScoreBadge } from "./score-badge";

type SortKey = "ticker" | "issuer" | "industry" | "shares" | "valueUsd" | "portfolioPct" | "shareDelta" | "status" | "currentPrice" | "priceChange1M" | "buyScore";

export function PortfolioTable({ rows }: { rows: PortfolioRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("valueUsd");
  const [sortAsc, setSortAsc] = useState(false);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === "ticker" || key === "issuer" || key === "status");
    }
  }

  const sorted = [...rows].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "ticker":
        cmp = (a.ticker || "ZZZ").localeCompare(b.ticker || "ZZZ");
        break;
      case "issuer":
        cmp = a.issuer.localeCompare(b.issuer);
        break;
      case "industry":
        cmp = (a.industry || "ZZZ").localeCompare(b.industry || "ZZZ");
        break;
      case "shares":
        cmp = a.shares - b.shares;
        break;
      case "valueUsd":
        cmp = a.valueUsd - b.valueUsd;
        break;
      case "portfolioPct":
        cmp = a.portfolioPct - b.portfolioPct;
        break;
      case "shareDelta":
        cmp = a.shareDelta - b.shareDelta;
        break;
      case "status":
        cmp = a.status.localeCompare(b.status);
        break;
      case "currentPrice":
        cmp = (a.currentPrice ?? 0) - (b.currentPrice ?? 0);
        break;
      case "priceChange1M":
        cmp = (a.priceChange1M ?? 0) - (b.priceChange1M ?? 0);
        break;
      case "buyScore":
        cmp = (a.buyScore ?? 0) - (b.buyScore ?? 0);
        break;
    }
    return sortAsc ? cmp : -cmp;
  });

  const th = (label: string, key: SortKey, tooltip?: string) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider cursor-pointer hover:text-foreground select-none"
      onClick={() => handleSort(key)}
      title={tooltip}
    >
      {label}
      {tooltip && <span className="ml-0.5 text-muted/60">&#9432;</span>}
      {sortKey === key && (
        <span className="ml-1">{sortAsc ? "\u25B2" : "\u25BC"}</span>
      )}
    </th>
  );

  return (
    <>
    <div className="overflow-x-auto rounded-lg border border-border bg-card-bg shadow-sm">
      <table className="min-w-full divide-y divide-border">
        <thead className="bg-gray-50">
          <tr>
            {th("Ticker", "ticker")}
            {th("Company", "issuer")}
            {th("Industry", "industry")}
            {th("Shares", "shares")}
            {th("% of Portfolio", "portfolioPct")}
            {th("Price", "currentPrice")}
            {th("1M Change", "priceChange1M")}
            {th("Buy Score", "buyScore", "0-100 quantitative score.\n\n1M Price Momentum (40 pts): Based on 1-month price change, capped at ±50%.\n\nInstitutional Momentum (60 pts): Based on quarter-over-quarter share changes. New positions score max points.")}
            {th("vs. Last Quarter", "shareDelta")}
            {th("Status", "status")}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map((row, i) => (
            <tr key={`${row.cusip}-${i}`} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium">
                {row.ticker ? (
                  <Link
                    href={`/stock/${row.ticker}`}
                    className="text-accent hover:underline"
                  >
                    {row.ticker}
                  </Link>
                ) : (
                  <span className="text-muted">--</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm">{row.issuer}</td>
              <td className="px-4 py-3 text-sm text-muted">
                {row.industry || "--"}
              </td>
              <td className="px-4 py-3 text-sm font-mono">
                {fmtShares(row.shares)}
              </td>
              <td className="px-4 py-3 text-sm font-mono">
                {fmtPct(row.portfolioPct)}
              </td>
              <td className="px-4 py-3 text-sm font-mono">
                {row.currentPrice != null
                  ? `$${row.currentPrice.toFixed(2)}`
                  : <span className="text-muted">--</span>}
              </td>
              <td className="px-4 py-3 text-sm font-mono">
                {row.priceChange1M != null ? (
                  <span
                    className={
                      row.priceChange1M >= 0 ? "text-green-600" : "text-red-600"
                    }
                  >
                    {row.priceChange1M >= 0 ? "+" : ""}
                    {(row.priceChange1M * 100).toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-muted">--</span>
                )}
              </td>
              <td className="px-4 py-3">
                <ScoreBadge score={row.buyScore} />
              </td>
              <td className="px-4 py-3 text-sm font-mono">
                <span
                  className={
                    row.shareDelta > 0
                      ? "text-green-600"
                      : row.shareDelta < 0
                        ? "text-red-600"
                        : "text-muted"
                  }
                >
                  {row.shareDelta > 0 ? "+" : ""}
                  {fmtShares(row.shareDelta)}
                </span>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <p className="mt-3 text-xs text-muted">
      <strong>Buy Score (0-100):</strong> 1M Price Momentum (40 pts) + Institutional Momentum (60 pts).
      Price momentum is based on 1-month return capped at &plusmn;50%.
      Institutional momentum reflects quarter-over-quarter share changes; new positions receive maximum points.
    </p>
    </>
  );
}
