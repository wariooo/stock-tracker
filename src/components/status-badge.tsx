import type { PositionStatus } from "@/lib/types";

const styles: Record<PositionStatus, string> = {
  NEW: "bg-blue-100 text-blue-700",
  EXITED: "bg-red-100 text-red-700",
  INCREASED: "bg-green-100 text-green-700",
  DECREASED: "bg-yellow-100 text-yellow-700",
  UNCHANGED: "bg-gray-100 text-gray-500",
};

export function StatusBadge({ status }: { status: PositionStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}
