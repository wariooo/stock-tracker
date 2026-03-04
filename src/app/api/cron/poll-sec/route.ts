import { NextRequest, NextResponse } from "next/server";
import { pollFilings } from "@/lib/sec-client";
import { isValidCik, DEFAULT_CIK } from "@/lib/entities";

export async function POST(request: NextRequest) {
  try {
    const cik = request.nextUrl.searchParams.get("cik") || DEFAULT_CIK;
    if (!isValidCik(cik)) {
      return NextResponse.json({ success: false, error: "Invalid CIK" }, { status: 400 });
    }
    const result = await pollFilings(cik);
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
