import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { PDFParse } from "pdf-parse";
import { checkRateLimit } from "@/lib/rateLimiter";
import { MAX_CONTRACT_CHARS, sanitizeContractInput } from "@/lib/sanitize";

export async function POST(req: NextRequest) {
  try {
    const rate = await checkRateLimit(req);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: `Rate limit exceeded (${rate.limit} requests/min). Please wait ${Math.ceil(
            rate.resetMs / 1000
          )}s before uploading another file.`,
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

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "No file uploaded." },
        { status: 400 }
      );
    }

    const fileName = file.name || "Uploaded-Document";
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!fileName.toLowerCase().endsWith(".pdf")) {
      const rawText = buffer.toString("utf-8");
      const { sanitized, truncated } = sanitizeContractInput(rawText);
      return NextResponse.json({
        ok: true,
        fileName,
        extractedText: sanitized,
        truncated,
        maxChars: MAX_CONTRACT_CHARS,
      });
    }

    try {
      const parser = new PDFParse({ data: buffer });
      const parsedPdf = await parser.getText();
      await parser.destroy();
      const textFromPdfParse = (parsedPdf.text || "").trim();
      if (textFromPdfParse.length > 30) {
        const { sanitized, truncated } =
          sanitizeContractInput(textFromPdfParse);
        return NextResponse.json({
          ok: true,
          fileName,
          extractedText: sanitized,
          pageCount: parsedPdf.total,
          truncated,
          maxChars: MAX_CONTRACT_CHARS,
        });
      }
    } catch {}

    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && geminiKey.trim().length > 10) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiKey.trim() });
        const base64Pdf = buffer.toString("base64");
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            {
              inlineData: {
                mimeType: "application/pdf",
                data: base64Pdf,
              },
            },
            "Extract the complete verbatim text and clauses from this PDF document. Return plain text only without markdown commentary.",
          ],
        });
        const pdfText = (response.text || "").trim();
        if (pdfText.length > 20) {
          const { sanitized, truncated } = sanitizeContractInput(pdfText);
          return NextResponse.json({
            ok: true,
            fileName,
            extractedText: sanitized,
            truncated,
            maxChars: MAX_CONTRACT_CHARS,
          });
        }
      } catch {}
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          "Could not extract text from this PDF. Please paste the contract clauses directly or upload a standard PDF.",
      },
      { status: 422 }
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
