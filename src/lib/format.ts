export function fmtUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function fmtPct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export function fmtShares(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}
