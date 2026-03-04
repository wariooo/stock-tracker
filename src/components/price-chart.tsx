"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { PricePoint } from "@/lib/types";

const PERIODS = ["1W", "1M", "6M", "1Y"] as const;
type PeriodLabel = (typeof PERIODS)[number];
const periodMap: Record<PeriodLabel, string> = {
  "1W": "1w",
  "1M": "1m",
  "6M": "6m",
  "1Y": "1y",
};

export function PriceChart({ ticker }: { ticker: string }) {
  const [period, setPeriod] = useState<PeriodLabel>("1M");
  const [data, setData] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/stock/${encodeURIComponent(ticker)}?period=${periodMap[period]}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to fetch: ${r.status}`);
        return r.json();
      })
      .then((d) => {
        setData(d.prices || []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message || "Failed to load price data");
        setData([]);
        setLoading(false);
      });
  }, [ticker, period]);

  return (
    <div className="rounded-lg border border-border bg-card-bg p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Price History</h3>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs rounded-md font-medium ${
                period === p
                  ? "bg-accent text-white"
                  : "bg-gray-100 text-muted hover:bg-gray-200"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="h-64 flex items-center justify-center text-muted">
          Loading...
        </div>
      ) : error ? (
        <div className="h-64 flex items-center justify-center text-red-500">
          {error}
        </div>
      ) : data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-muted">
          No price data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickFormatter={(d: string) => d.slice(5)}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => `$${v.toFixed(0)}`}
              domain={["auto", "auto"]}
            />
            <Tooltip
              formatter={(value: number | undefined) => [`$${(value ?? 0).toFixed(2)}`, "Close"]}
            />
            <Line
              type="monotone"
              dataKey="close"
              stroke="#0b5fff"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
