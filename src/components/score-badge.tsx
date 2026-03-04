export function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-muted">--</span>;

  let bg: string;
  let text: string;
  if (score >= 70) {
    bg = "bg-green-100";
    text = "text-green-800";
  } else if (score >= 40) {
    bg = "bg-yellow-100";
    text = "text-yellow-800";
  } else {
    bg = "bg-red-100";
    text = "text-red-800";
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${bg} ${text}`}
    >
      {score}
    </span>
  );
}
