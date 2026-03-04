import type { TradeType } from "@/lib/types";

const labels: Record<TradeType, string> = {
  purchase: "BUY",
  sale: "SELL",
  sale_partial: "SELL",
  sale_full: "SELL",
  exchange: "EXCHANGE",
};

const styles: Record<TradeType, string> = {
  purchase: "bg-green-100 text-green-700",
  sale: "bg-red-100 text-red-700",
  sale_partial: "bg-red-100 text-red-700",
  sale_full: "bg-red-100 text-red-700",
  exchange: "bg-gray-100 text-gray-500",
};

export function TradeTypeBadge({ type }: { type: TradeType }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[type]}`}
    >
      {labels[type]}
    </span>
  );
}
