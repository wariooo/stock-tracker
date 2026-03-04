"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Entity } from "@/lib/entities";

interface HeaderProps {
  entities: Entity[];
  selectedCik: string;
}

export function Header({ entities, selectedCik }: HeaderProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedEntity = entities.find((e) => e.cik === selectedCik);

  function handleEntityChange(cik: string) {
    router.push(`/?cik=${cik}`);
  }

  async function handleRefresh() {
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

  return (
    <header className="border-b border-border bg-card-bg">
      <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">SEC 13F Stock Tracker</h1>
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
        </div>
        <div className="flex items-center gap-3">
          {message && (
            <span className="text-sm text-muted">{message}</span>
          )}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
          >
            {loading ? "Polling..." : "Refresh from SEC"}
          </button>
        </div>
      </div>
    </header>
  );
}
