import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

function extractNativeTextFromPdfBuffer(buffer: Buffer): string {
  const raw = buffer.toString("latin1");
  const extractedChunks: string[] = [];

  const btEtRegex = /BT[\s\S]*?ET/g;
  const blocks = raw.match(btEtRegex) || [];

  for (const block of blocks) {
    const parenMatches = block.match(/\((?:\\.|[^\\()])*\)/g) || [];
    for (const token of parenMatches) {
      const cleaned = token
        .slice(1, -1)
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, " ")
        .replace(/\\t/g, " ")
        .replace(/\\\(/g, "(")
        .replace(/\\\)/g, ")")
        .replace(/\\\\/g, "\\");
      if (/[a-zA-Z0-9₹]/.test(cleaned)) {
        extractedChunks.push(cleaned);
      }
    }
  }

  return extractedChunks.join(" ").replace(/\s+/g, " ").trim();
}

export async function POST(req: NextRequest) {
  try {
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
      const text = buffer.toString("utf-8").trim();
      return NextResponse.json({
        ok: true,
        fileName,
        extractedText: text,
      });
    }

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
          return NextResponse.json({
            ok: true,
            fileName,
            extractedText: pdfText,
          });
        }
      } catch {}
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey && anthropicKey.trim().length > 10) {
      try {
        const base64Pdf = buffer.toString("base64");
        const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicKey.trim(),
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model,
            max_tokens: 4096,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "document",
                    source: {
                      type: "base64",
                      media_type: "application/pdf",
                      data: base64Pdf,
                    },
                  },
                  {
                    type: "text",
                    text: "Extract the complete verbatim text and clauses from this PDF document. Return plain text only without commentary.",
                  },
                ],
              },
            ],
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const pdfText = (data.content?.[0]?.text || "").trim();
          if (pdfText.length > 20) {
            return NextResponse.json({
              ok: true,
              fileName,
              extractedText: pdfText,
            });
          }
        }
      } catch {}
    }

    const nativeExtracted = extractNativeTextFromPdfBuffer(buffer);
    if (nativeExtracted.length > 20) {
      return NextResponse.json({
        ok: true,
        fileName,
        extractedText: nativeExtracted,
      });
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          "Could not extract text from this PDF. Please paste the contract text directly or upload a text-based PDF.",
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
