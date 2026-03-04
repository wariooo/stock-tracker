import { NextResponse } from "next/server";
import { pollCongressTrades } from "@/lib/congress-client";

export async function POST() {
  try {
    const { house, senate } = await pollCongressTrades();
    return NextResponse.json({ success: true, house, senate });
  } catch (err) {
    console.error("[congress/refresh] Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
