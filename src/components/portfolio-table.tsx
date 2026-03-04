"use client";

import { useState } from "react";
import Link from "next/link";
import type { PortfolioRow } from "@/lib/types";
import { fmtUsd, fmtPct, fmtShares } from "@/lib/format";
import { StatusBadge } from "./status-badge";
import { ScoreBadge } from "./score-badge";

type SortKey = "ticker" | "issuer" | "industry" | "shares" | "valueUsd" | "portfolioPct" | "shareDelta" | "status" | "currentPrice" | "priceChange" | "estGain" | "buyScore";
type PriceChangePeriod = "1M" | "6M" | "1Y";

function getPriceChange(row: PortfolioRow, period: PriceChangePeriod): number | null {
  switch (period) {
    case "1M": return row.priceChange1M;
    case "6M": return row.priceChange6M;
    case "1Y": return row.priceChange1Y;
  }
}

function estGain(row: PortfolioRow): number | null {
  if (row.entryPrice == null || row.entryPrice <= 0 || row.currentPrice == null) return null;
  return (row.currentPrice - row.entryPrice) / row.entryPrice;
}

export function PortfolioTable({ rows }: { rows: PortfolioRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("valueUsd");
  const [sortAsc, setSortAsc] = useState(false);
  const [priceChangePeriod, setPriceChangePeriod] = useState<PriceChangePeriod>("1M");

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
      case "priceChange":
        cmp = (getPriceChange(a, priceChangePeriod) ?? 0) - (getPriceChange(b, priceChangePeriod) ?? 0);
        break;
      case "estGain":
        cmp = (estGain(a) ?? 0) - (estGain(b) ?? 0);
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

  const periods: PriceChangePeriod[] = ["1M", "6M", "1Y"];

  return (
    <>
    <div className="overflow-x-auto rounded-lg border border-border bg-card-bg shadow-sm">
      <table className="min-w-full divide-y divide-border">
        <thead className="bg-gray-50">
          <tr>
            {th("Ticker", "ticker")}
            {th("Company", "issuer")}
            {th("Industry", "industry")}
            {th("Shares Held", "shares")}
            {th("Weight (%)", "portfolioPct")}
            {th("Price ($)", "currentPrice")}
            {th("Est. Gain", "estGain", "Estimated unrealized gain/loss based on 13F entry price (filing value / shares) vs current market price")}
            <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider select-none">
              <span
                className="cursor-pointer hover:text-foreground"
                onClick={() => handleSort("priceChange")}
              >
                Price Chg
                {sortKey === "priceChange" && (
                  <span className="ml-1">{sortAsc ? "\u25B2" : "\u25BC"}</span>
                )}
              </span>
              <span className="ml-2 inline-flex rounded-md border border-border text-[10px] overflow-hidden">
                {periods.map((p) => (
                  <button
                    key={p}
                    onClick={(e) => { e.stopPropagation(); setPriceChangePeriod(p); }}
                    className={`px-1.5 py-0.5 ${priceChangePeriod === p ? "bg-accent text-white" : "hover:bg-gray-100"}`}
                  >
                    {p}
                  </button>
                ))}
              </span>
            </th>
            {th("Buy Score (0-100)", "buyScore", "0-100 quantitative score.\n\n1M Price Momentum (40 pts): Based on 1-month price change, capped at \u00B150%.\n\nInstitutional Momentum (60 pts): Based on quarter-over-quarter share changes. New positions score max points.")}
            {th("QoQ Shares +/-", "shareDelta", "Quarter-over-quarter change in share count")}
            {th("QoQ Status", "status", "Quarter-over-quarter position status")}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map((row, i) => {
            const gain = estGain(row);
            const priceChg = getPriceChange(row, priceChangePeriod);
            return (
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
                {gain != null ? (
                  <span className={gain >= 0 ? "text-green-600" : "text-red-600"}>
                    {gain >= 0 ? "+" : ""}
                    {(gain * 100).toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-muted">--</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm font-mono">
                {priceChg != null ? (
                  <span
                    className={priceChg >= 0 ? "text-green-600" : "text-red-600"}
                  >
                    {priceChg >= 0 ? "+" : ""}
                    {(priceChg * 100).toFixed(1)}%
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
            );
          })}
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
