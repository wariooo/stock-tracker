import type {
  FilingMeta,
  Position,
  PortfolioRow,
  PositionHistoryEntry,
  PositionStatus,
} from "./types";

// Score constants
const MOMENTUM_MAX_POINTS = 40;
const MOMENTUM_NEUTRAL_POINTS = 20;
const MOMENTUM_CLAMP_RANGE = 0.5;
const INSTITUTIONAL_MAX_POINTS = 60;
const INSTITUTIONAL_NEUTRAL_POINTS = 30;
const SCORE_MIN = 0;
const SCORE_MAX = 100;

function securityKey(p: Position): string {
  return `${p.issuer}|${p.cusip}|${p.putCall || ""}`;
}

export function buildPortfolioView(
  latestPositions: Position[],
  previousPositions: Position[]
): { rows: PortfolioRow[]; totalValue: number } {
  // Filter out options
  const current = latestPositions.filter((p) => !p.putCall);
  const previous = previousPositions.filter((p) => !p.putCall);

  const totalValue = current.reduce((sum, p) => sum + p.valueUsd, 0);

  // Build maps of previous positions by cusip key and by issuer name
  const prevByKey = new Map<string, Position>();
  const prevByIssuer = new Map<string, Position>();
  for (const p of previous) {
    prevByKey.set(securityKey(p), p);
    prevByIssuer.set(p.issuer.toUpperCase(), p);
  }

  // Only show current positions (no EXITED rows)
  const rows: PortfolioRow[] = current.map((p) => {
    // Match by exact key first, then fall back to issuer name
    const prev =
      prevByKey.get(securityKey(p)) ||
      prevByIssuer.get(p.issuer.toUpperCase()) ||
      null;

    let status: PositionStatus;
    let shareDelta: number;

    if (!prev) {
      status = "NEW";
      shareDelta = p.shares;
    } else {
      shareDelta = p.shares - prev.shares;
      if (shareDelta > 0) status = "INCREASED";
      else if (shareDelta < 0) status = "DECREASED";
      else status = "UNCHANGED";
    }

    return {
      issuer: p.issuer,
      cusip: p.cusip,
      ticker: null,
      valueUsd: p.valueUsd,
      shares: p.shares,
      portfolioPct: totalValue > 0 ? p.valueUsd / totalValue : 0,
      shareDelta,
      status,
      industry: null,
      currentPrice: null,
      priceChange1M: null,
      priceChange6M: null,
      priceChange1Y: null,
      entryPrice: p.shares > 0 ? p.valueUsd / p.shares : null,
      buyScore: null,
    };
  });

  // Sort by value descending
  rows.sort((a, b) => b.valueUsd - a.valueUsd);

  return { rows, totalValue };
}

export function buildPositionHistory(
  filings: FilingMeta[],
  positionsByAccession: Map<string, Position[]>,
  cusip: string,
  issuer?: string
): PositionHistoryEntry[] {
  const entries: PositionHistoryEntry[] = [];
  let prevShares: number | null = null;

  // filings should be sorted oldest to newest for delta calc
  const sorted = [...filings].sort((a, b) =>
    a.reportDate.localeCompare(b.reportDate)
  );

  for (const filing of sorted) {
    const positions = positionsByAccession.get(filing.accession) || [];
    const match = positions.find(
      (p) =>
        !p.putCall &&
        (p.cusip === cusip || (issuer && p.issuer === issuer))
    );

    if (match) {
      const shareDelta = prevShares !== null ? match.shares - prevShares : match.shares;
      const changePct =
        prevShares !== null && prevShares > 0
          ? shareDelta / prevShares
          : null;

      entries.push({
        reportDate: filing.reportDate,
        filingDate: filing.filingDate,
        shares: match.shares,
        valueUsd: match.valueUsd,
        shareDelta,
        changePct,
      });
      prevShares = match.shares;
    } else if (prevShares !== null) {
      // Position was exited
      entries.push({
        reportDate: filing.reportDate,
        filingDate: filing.filingDate,
        shares: 0,
        valueUsd: 0,
        shareDelta: -prevShares,
        changePct: -1,
      });
      prevShares = 0;
    }
  }

  return entries;
}

export interface BuyScoreInputs {
  priceChange1M: number | null;
  shareDelta: number;
  prevShares: number;
  status: PositionStatus;
}

export function scoreBuyPotential(inputs: BuyScoreInputs): number {
  let score = 0;

  // 1M momentum (0-40 pts): positive recent price movement
  if (inputs.priceChange1M != null && isFinite(inputs.priceChange1M)) {
    const clamped = Math.max(-MOMENTUM_CLAMP_RANGE, Math.min(MOMENTUM_CLAMP_RANGE, inputs.priceChange1M));
    score += Math.round(((clamped + MOMENTUM_CLAMP_RANGE) / (MOMENTUM_CLAMP_RANGE * 2)) * MOMENTUM_MAX_POINTS);
  } else {
    score += MOMENTUM_NEUTRAL_POINTS; // neutral if no data
  }

  // Institutional momentum (0-60 pts): share change from last quarter
  if (inputs.status === "NEW") {
    score += INSTITUTIONAL_MAX_POINTS; // New position = strong signal
  } else if (inputs.status === "EXITED") {
    score += 0;
  } else if (inputs.prevShares > 0) {
    const changePct = inputs.shareDelta / inputs.prevShares;
    if (!isFinite(changePct)) {
      score += INSTITUTIONAL_NEUTRAL_POINTS;
    } else {
      const clamped = Math.max(-1, Math.min(1, changePct));
      score += Math.round(((clamped + 1) / 2) * INSTITUTIONAL_MAX_POINTS);
    }
  } else {
    score += INSTITUTIONAL_NEUTRAL_POINTS; // neutral
  }

  return Math.max(SCORE_MIN, Math.min(SCORE_MAX, score));
}
