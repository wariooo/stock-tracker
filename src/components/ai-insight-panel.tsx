"use client";

import { useEffect, useState } from "react";
import { MarkdownText } from "./markdown-text";

interface AiInsightPanelProps {
  type: "stock" | "congress";
  data: Record<string, unknown>;
}

export function AiInsightPanel({ type, data }: AiInsightPanelProps) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchAnalysis() {
      try {
        const res = await fetch("/api/ai/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, data }),
        });

        if (!res.ok) {
          setLoading(false);
          return;
        }

        const json = await res.json();
        if (!cancelled) {
          setAnalysis(json.analysis);
        }
      } catch {
        // Graceful degradation
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAnalysis();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  if (!loading && !analysis) return null;

  return (
    <div className="rounded-lg border border-border bg-card-bg shadow-sm">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full px-5 py-4 flex items-center gap-2 text-left"
      >
        <span className="text-lg">&#10024;</span>
        <h3 className="text-sm font-semibold flex-1">AI Analysis</h3>
        <span className="text-muted text-xs">
          {collapsed ? "Show" : "Hide"}
        </span>
      </button>

      {!collapsed && (
        <div className="px-5 pb-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted">
              <span className="animate-spin inline-block w-4 h-4 border-2 border-muted border-t-accent rounded-full" />
              Analyzing...
            </div>
          ) : (
            <MarkdownText text={analysis!} />
          )}
        </div>
      )}
    </div>
  );
}
