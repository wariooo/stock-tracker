export interface FilingMeta {
  accession: string;
  filingDate: string;
  reportDate: string;
  primaryDocument: string;
}

export interface Position {
  issuer: string;
  cusip: string;
  valueUsd: number;
  shares: number;
  putCall: string | null;
  reportDate: string;
  filingDate: string;
  accession: string;
}

export type PositionStatus =
  | "NEW"
  | "EXITED"
  | "INCREASED"
  | "DECREASED"
  | "UNCHANGED";

export interface PortfolioRow {
  issuer: string;
  cusip: string;
  ticker: string | null;
  valueUsd: number;
  shares: number;
  portfolioPct: number;
  shareDelta: number;
  status: PositionStatus;
  industry: string | null;
  currentPrice: number | null;
  priceChange1M: number | null;
  priceChange6M: number | null;
  priceChange1Y: number | null;
  entryPrice: number | null;
  buyScore: number | null;
}

export interface PositionHistoryEntry {
  reportDate: string;
  filingDate: string;
  shares: number;
  valueUsd: number;
  shareDelta: number;
  changePct: number | null;
}

export interface PricePoint {
  date: string;
  close: number;
}

export interface StockDetail {
  ticker: string;
  issuer: string;
  cusip: string;
  history: PositionHistoryEntry[];
  prices: PricePoint[];
}

export interface PortfolioResponse {
  filing: FilingMeta | null;
  rows: PortfolioRow[];
  totalValue: number;
  positionCount: number;
}

export interface PortfolioHistoryResponse {
  filings: FilingMeta[];
}

// --- Congress trades ---

export type CongressChamber = "house" | "senate";
export type TradeType = "purchase" | "sale" | "sale_partial" | "sale_full" | "exchange";

export interface CongressTrade {
  id: string;
  member: string;
  chamber: CongressChamber;
  ticker: string | null;
  assetDescription: string;
  assetType: string;
  tradeType: TradeType;
  amount: string;
  transactionDate: string;
  disclosureDate: string;
  owner: string;
  currentPrice: number | null;
  priceChange1M: number | null;
}

export interface CongressTradesResponse {
  trades: CongressTrade[];
  totalCount: number;
  members: string[];
  lastUpdated: string | null;
}
