import { NextRequest, NextResponse } from "next/server";
import { generateAnalysis } from "@/lib/ollama";
import { isAiAnalysisEnabled } from "@/lib/feature-flags";
import type { AiAnalysisRequest, AiAnalysisResponse } from "@/lib/types";

function buildStockPrompt(data: Record<string, unknown>): string {
  const { ticker, issuer, history, currentPrice, priceChange1M, priceChange6M, priceChange1Y } = data;

  const historyLines = Array.isArray(history)
    ? (history as Array<Record<string, unknown>>)
        .map(
          (h) =>
            `${h.reportDate} | ${Number(h.shares).toLocaleString()} shares | $${Number(h.valueUsd).toLocaleString()} | delta: ${Number(h.shareDelta).toLocaleString()} | ${h.changePct != null ? `${Number(h.changePct).toFixed(1)}%` : "N/A"}`
        )
        .join("\n")
    : "No history available";

  return `You are a financial analyst. Analyze this stock position data concisely (3-5 sentences).

Stock: ${ticker} (${issuer})
Current Price: $${currentPrice ?? "N/A"}
Price Changes: 1M ${priceChange1M ?? "N/A"}%, 6M ${priceChange6M ?? "N/A"}%, 1Y ${priceChange1Y ?? "N/A"}%

Institutional Position History (quarterly 13F filings):
${historyLines}

Provide: trend assessment, notable position changes, and brief outlook based on institutional activity.`;
}

function buildCongressPrompt(data: Record<string, unknown>): string {
  const { totalTrades, uniqueMembers, topTickers, recentTrades } = data;

  const topTickerLines = Array.isArray(topTickers)
    ? (topTickers as Array<{ ticker: string; count: number }>)
        .map((t) => `${t.ticker}: ${t.count} trades`)
        .join(", ")
    : "N/A";

  const tradeLines = Array.isArray(recentTrades)
    ? (recentTrades as Array<Record<string, unknown>>)
        .map(
          (t) =>
            `${t.member} | ${t.ticker ?? t.assetDescription} | ${t.tradeType} | ${t.amount} | ${t.transactionDate}`
        )
        .join("\n")
    : "No trades available";

  return `You are a financial analyst. Analyze recent congressional stock trading activity concisely (3-5 sentences).

Summary: ${totalTrades} trades by ${uniqueMembers} members.
Most traded tickers: ${topTickerLines}

Recent trades:
${tradeLines}

Provide: notable trading patterns, any concentrated activity, and what the trading direction suggests.`;
}

export async function POST(req: NextRequest) {
  try {
    if (!isAiAnalysisEnabled()) {
      return NextResponse.json(
        { analysis: null } satisfies AiAnalysisResponse,
        { status: 503 }
      );
    }

    const body = (await req.json()) as AiAnalysisRequest;

    if (!body.type || !body.data) {
      return NextResponse.json({ analysis: null }, { status: 400 });
    }

    const prompt =
      body.type === "stock"
        ? buildStockPrompt(body.data)
        : buildCongressPrompt(body.data);

    const analysis = await generateAnalysis(prompt);

    return NextResponse.json({ analysis } satisfies AiAnalysisResponse);
  } catch (err) {
    console.error("[ai/analyze] Error:", err);
    return NextResponse.json({ analysis: null } satisfies AiAnalysisResponse);
  }
}
