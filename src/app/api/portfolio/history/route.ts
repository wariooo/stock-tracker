import { NextRequest, NextResponse } from "next/server";
import { readFilings } from "@/lib/data-store";
import { isValidCik, DEFAULT_CIK } from "@/lib/entities";
import type { PortfolioHistoryResponse } from "@/lib/types";

export async function GET(request: NextRequest) {
  const cik = request.nextUrl.searchParams.get("cik") || DEFAULT_CIK;
  if (!isValidCik(cik)) {
    return NextResponse.json({ error: "Invalid CIK" }, { status: 400 });
  }

  const filings = await readFilings(cik);
  return NextResponse.json<PortfolioHistoryResponse>({ filings });
}
