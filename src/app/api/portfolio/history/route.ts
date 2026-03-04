import { NextResponse } from "next/server";
import { readFilings } from "@/lib/data-store";
import type { PortfolioHistoryResponse } from "@/lib/types";

export async function GET() {
  const filings = await readFilings();
  return NextResponse.json<PortfolioHistoryResponse>({ filings });
}
