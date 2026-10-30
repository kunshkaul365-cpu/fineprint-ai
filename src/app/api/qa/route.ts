import { NextRequest, NextResponse } from "next/server";
import { askContractQuestionWithAI } from "@/lib/aiEngine";
import { ContractAuditResult } from "@/types/fineprint";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, audit } = body as {
      question: string;
      audit: ContractAuditResult;
    };

    if (!question || !audit) {
      return NextResponse.json(
        { ok: false, error: "Question and active audit context are required." },
        { status: 400 }
      );
    }

    const response = await askContractQuestionWithAI({
      question,
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
