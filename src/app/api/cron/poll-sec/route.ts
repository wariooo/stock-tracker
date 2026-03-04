import { NextResponse } from "next/server";
import { pollFilings } from "@/lib/sec-client";

const DEFAULT_CIK = "0002045724"; // Situational Awareness LP

export async function POST() {
  try {
    const result = await pollFilings(DEFAULT_CIK);
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
