import { NextRequest, NextResponse } from "next/server";
import { analyzeContractWithAI } from "@/lib/aiEngine";
import { getStoredAudits, saveAuditToDatabase } from "@/lib/serverStore";
import { isSupabaseConfigured } from "@/lib/supabase";
import { ContractCategory } from "@/types/fineprint";
import { checkRateLimit } from "@/lib/rateLimiter";
import {
  MAX_CONTRACT_CHARS,
  MIN_CONTRACT_CHARS,
  sanitizeContractInput,
  sanitizeShortText,
} from "@/lib/sanitize";

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
    const rate = await checkRateLimit(req);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: `Rate limit reached (${rate.limit} audits per minute). Please wait ${Math.ceil(
            rate.resetMs / 1000
          )} seconds before running another audit.`,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(rate.limit),
            "X-RateLimit-Remaining": String(rate.remaining),
          },
        }
      );
    }

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

    if (typeof rawText === "string" && rawText.length > MAX_CONTRACT_CHARS + 500) {
      return NextResponse.json(
        {
          ok: false,
          error: `Contract text exceeds the maximum limit of ${MAX_CONTRACT_CHARS.toLocaleString()} characters.`,
        },
        { status: 400 }
      );
    }

    const { sanitized, injectionFlagged } = sanitizeContractInput(rawText);
    const cleanTitle =
      sanitizeShortText(documentTitle) || `${category} Examination`;

    if (!sanitized || sanitized.length < MIN_CONTRACT_CHARS) {
      return NextResponse.json(
        {
          ok: false,
          error: `Please provide at least ${MIN_CONTRACT_CHARS} characters of valid contract clauses.`,
        },
        { status: 400 }
      );
    }

    const auditResult = await analyzeContractWithAI({
      documentTitle: cleanTitle,
      category,
      rawText: sanitized,
    });

    auditResult.userEmail = userEmail ? sanitizeShortText(userEmail, 120) : undefined;
    auditResult.userName = userName ? sanitizeShortText(userName, 80) : undefined;

    const saved = await saveAuditToDatabase(auditResult);

    return NextResponse.json(
      {
        ok: true,
        audit: saved,
        sanitizedNotice: injectionFlagged
          ? "Potentially unsafe prompt instructions were stripped prior to analysis."
          : undefined,
      },
      {
        headers: {
          "X-RateLimit-Limit": String(rate.limit),
          "X-RateLimit-Remaining": String(rate.remaining),
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
