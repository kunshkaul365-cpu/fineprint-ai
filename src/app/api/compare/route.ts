import { NextRequest, NextResponse } from "next/server";
import { compareContractsWithAI } from "@/lib/aiEngine";
import {
  getStoredComparisons,
  saveComparisonToDatabase,
} from "@/lib/serverStore";

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
    const body = await req.json();
    const {
      docATitle = "Instrument A",
      docAText = "",
      docBTitle = "Instrument B",
      docBText = "",
    } = body;

    if (!docAText.trim() || !docBText.trim()) {
      return NextResponse.json(
        {
          ok: false,
          error: "Please enter text for both Instrument A and Instrument B.",
        },
        { status: 400 }
      );
    }

    const comparison = await compareContractsWithAI({
      docATitle,
      docAText,
      docBTitle,
      docBText,
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
