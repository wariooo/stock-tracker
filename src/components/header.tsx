"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function Header() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleRefresh() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/cron/poll-sec", { method: "POST" });
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
        <div>
          <h1 className="text-xl font-bold">SEC 13F Stock Tracker</h1>
          <p className="text-sm text-muted">Situational Awareness LP</p>
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
