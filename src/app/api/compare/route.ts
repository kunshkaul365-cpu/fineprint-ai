import { NextRequest, NextResponse } from "next/server";
import { compareContractsWithAI } from "@/lib/aiEngine";
import {
  getStoredComparisons,
  saveComparisonToDatabase,
} from "@/lib/serverStore";
import { checkRateLimit } from "@/lib/rateLimiter";
import { sanitizeContractInput, sanitizeShortText } from "@/lib/sanitize";

export async function GET() {
  try {
    const comparisons = await getStoredComparisons();
    return NextResponse.json({ ok: true, comparisons });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const rate = await checkRateLimit(req);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: `Rate limit reached (${rate.limit} requests/min). Please wait ${Math.ceil(
            rate.resetMs / 1000
          )}s.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const {
      docATitle = "Instrument A",
      docAText = "",
      docBTitle = "Instrument B",
      docBText = "",
    } = body;

    const cleanA = sanitizeContractInput(docAText).sanitized;
    const cleanB = sanitizeContractInput(docBText).sanitized;

    if (!cleanA || !cleanB) {
      return NextResponse.json(
        {
          ok: false,
          error: "Please enter text for both Instrument A and Instrument B.",
        },
        { status: 400 }
      );
    }

    const comparison = await compareContractsWithAI({
      docATitle: sanitizeShortText(docATitle) || "Instrument A",
      docAText: cleanA,
      docBTitle: sanitizeShortText(docBTitle) || "Instrument B",
      docBText: cleanB,
    });

    const saved = await saveComparisonToDatabase(comparison);
    return NextResponse.json({ ok: true, comparison: saved });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
