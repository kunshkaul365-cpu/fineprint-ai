import { NextRequest, NextResponse } from "next/server";
import { askContractQuestionWithAI } from "@/lib/aiEngine";
import { ContractAuditResult } from "@/types/fineprint";
import { checkRateLimit } from "@/lib/rateLimiter";
import { MAX_QUESTION_CHARS, sanitizeShortText } from "@/lib/sanitize";

export async function POST(req: NextRequest) {
  try {
    const rate = await checkRateLimit(req);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: `Rate limit reached. Please wait ${Math.ceil(
            rate.resetMs / 1000
          )}s.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { question, audit } = body as {
      question: string;
      audit: ContractAuditResult;
    };

    const cleanQuestion = sanitizeShortText(question, MAX_QUESTION_CHARS);

    if (!cleanQuestion || !audit) {
      return NextResponse.json(
        { ok: false, error: "Question and active audit context are required." },
        { status: 400 }
      );
    }

    const response = await askContractQuestionWithAI({
      question: cleanQuestion,
      audit,
    });

    return NextResponse.json({ ok: true, ...response });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
