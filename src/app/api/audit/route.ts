import { NextRequest, NextResponse } from "next/server";
import { analyzeContractWithAI } from "@/lib/aiEngine";
import { getStoredAudits, saveAuditToDatabase } from "@/lib/serverStore";
import { isSupabaseConfigured } from "@/lib/supabase";
import { ContractCategory } from "@/types/fineprint";

export async function GET() {
  try {
    const audits = await getStoredAudits();
    return NextResponse.json({
      ok: true,
      audits,
      dbConnected: isSupabaseConfigured,
      aiConfigured: Boolean(process.env.GEMINI_API_KEY),
    });
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
      documentTitle = "Untitled Agreement",
      category = "Job Offer Letter",
      rawText = "",
      userEmail,
      userName,
    } = body as {
      documentTitle?: string;
      category?: ContractCategory;
      rawText?: string;
      userEmail?: string;
      userName?: string;
    };

    if (!rawText || rawText.trim().length < 20) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Please enter or upload at least a few lines of a contract, offer letter, or rent agreement.",
        },
        { status: 400 }
      );
    }

    const auditResult = await analyzeContractWithAI({
      documentTitle,
      category,
      rawText,
    });

    auditResult.userEmail = userEmail;
    auditResult.userName = userName;

    const saved = await saveAuditToDatabase(auditResult);

    return NextResponse.json({
      ok: true,
      audit: saved,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
