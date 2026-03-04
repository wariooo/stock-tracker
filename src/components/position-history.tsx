import type { PositionHistoryEntry } from "@/lib/types";
import { fmtUsd, fmtShares, fmtPct } from "@/lib/format";

export function PositionHistory({ entries }: { entries: PositionHistoryEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-muted text-sm">No position history available.</p>;
  }

  // Show newest first
  const sorted = [...entries].reverse();

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card-bg shadow-sm">
      <table className="min-w-full divide-y divide-border">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">
              Report Date
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">
              Shares
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">
              Value
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">
              Change
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase">
              Change %
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map((e) => (
            <tr key={e.reportDate} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm">{e.reportDate}</td>
              <td className="px-4 py-3 text-sm font-mono">
                {fmtShares(e.shares)}
              </td>
              <td className="px-4 py-3 text-sm font-mono">
                {fmtUsd(e.valueUsd)}
              </td>
              <td className="px-4 py-3 text-sm font-mono">
                <span
                  className={
                    e.shareDelta > 0
                      ? "text-green-600"
                      : e.shareDelta < 0
                        ? "text-red-600"
                        : "text-muted"
                  }
                >
                  {e.shareDelta > 0 ? "+" : ""}
                  {fmtShares(e.shareDelta)}
                </span>
              </td>
              <td className="px-4 py-3 text-sm font-mono">
                {e.changePct !== null ? (
                  <span
                    className={
                      e.changePct > 0
                        ? "text-green-600"
                        : e.changePct < 0
                          ? "text-red-600"
                          : "text-muted"
                    }
                  >
                    {e.changePct > 0 ? "+" : ""}
                    {fmtPct(e.changePct)}
                  </span>
                ) : (
                  <span className="text-muted">--</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
