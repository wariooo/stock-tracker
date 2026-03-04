"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Entity } from "@/lib/entities";

type ActiveTab = "13f" | "congress";

interface HeaderProps {
  entities?: Entity[];
  selectedCik?: string;
  activeTab?: ActiveTab;
}

export function Header({ entities, selectedCik, activeTab = "13f" }: HeaderProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function handleEntityChange(cik: string) {
    router.push(`/?cik=${cik}`);
  }

  async function handleRefreshSEC() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/cron/poll-sec?cik=${selectedCik}`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setMessage(
          data.newFilings > 0
            ? `Found ${data.newFilings} new filing(s)`
            : "No new filings found"
        );
        router.refresh();
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch {
      setMessage("Failed to poll SEC");
    } finally {
      setLoading(false);
    }
  }

  async function handleRefreshCongress() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/congress/refresh", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setMessage(`Loaded ${data.house} House + ${data.senate} Senate trades`);
        router.refresh();
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch {
      setMessage("Failed to fetch Congress data");
    } finally {
      setLoading(false);
    }
  }

  return (
    <header className="border-b border-border bg-card-bg">
      <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">Stock Tracker</h1>
          {activeTab === "13f" && entities && selectedCik && (
            <>
              <span className="text-sm text-muted">Source:</span>
              <select
                value={selectedCik}
                onChange={(e) => handleEntityChange(e.target.value)}
                className="text-sm text-muted bg-transparent border border-border rounded px-2 py-1 cursor-pointer hover:border-accent focus:outline-none focus:border-accent"
              >
                {entities.map((entity) => (
                  <option key={entity.cik} value={entity.cik}>
                    {entity.name}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {message && (
            <span className="text-sm text-muted">{message}</span>
          )}
          {activeTab === "13f" ? (
            <button
              onClick={handleRefreshSEC}
              disabled={loading}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
            >
              {loading ? "Polling..." : "Refresh from SEC"}
            </button>
          ) : (
            <button
              onClick={handleRefreshCongress}
              disabled={loading}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh Congress Data"}
            </button>
          )}
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4">
        <nav className="flex gap-0 -mb-px">
          <Link
            href="/"
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === "13f"
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground hover:border-gray-300"
            }`}
          >
            13F Tracker
          </Link>
          <Link
            href="/congress"
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === "congress"
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground hover:border-gray-300"
            }`}
          >
            Congress Trades
          </Link>
        </nav>
      </div>
    </header>
  );
}
