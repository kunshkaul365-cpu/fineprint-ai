import { GoogleGenAI } from "@google/genai";
import {
  AuditedClause,
  ContractAuditResult,
  ContractCategory,
  ContractComparisonResult,
} from "@/types/fineprint";

async function tryLiveCloudLLM(prompt: string): Promise<string | null> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey.trim().length > 10) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey.trim() });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });
      if (response.text) return response.text;
    } catch {}
  }

  const openAiKey = process.env.OPENAI_API_KEY;
  if (openAiKey && openAiKey.trim().length > 10) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiKey.trim()}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content:
                "You are FinePrint Counsel, an expert Indian legal and financial contract auditor. Always respond with valid JSON only.",
            },
            { role: "user", content: prompt },
          ],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
      }
    } catch {}
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey && anthropicKey.trim().length > 10) {
    try {
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
          temperature: 0.2,
          system:
            "You are FinePrint Counsel, an expert Indian legal and financial contract auditor. Output strictly raw valid JSON with no markdown code fences.",
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const rawText = data.content?.[0]?.text || "";
        const cleaned = rawText
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/```\s*$/i, "")
          .trim();
        if (cleaned) return cleaned;
      }
    } catch {}
  }

  return null;
}

export async function analyzeContractWithAI(params: {
  documentTitle: string;
  category: ContractCategory;
  rawText: string;
}): Promise<ContractAuditResult> {
  const { documentTitle, category, rawText } = params;
  const trimmed = rawText.trim();

  const prompt = `Examine the following ${category} document titled "${documentTitle}" strictly based on the text provided by the user and applicable Indian law (Indian Contract Act 1872, labour regulations, tenancy norms).

USER DOCUMENT TEXT:
"""
${trimmed.slice(0, 20000)}
"""

Return ONLY valid JSON matching this exact structure:
{
  "riskScore": number (0 to 100, where 68-100 is High Risk, 35-67 is Moderate Caution, 0-34 is Safe),
  "riskVerdict": "High Risk — Negotiate Before Signing" | "Moderate Caution — Review Yellow Flags" | "Safe & Balanced Agreement",
  "executiveSummary": "2-3 sentences objective legal summary of the specific document provided",
  "hinglishSummary": "2-3 sentences clear conversational Hinglish explanation of the document's risks and terms",
  "estimatedFinancialExposure": "quantified rupee or legal risk found in this text",
  "keyMetrics": {
    "lockInOrBondPeriod": "exact lock-in or bond found in text, or 'Not Specified'",
    "noticePeriod": "exact notice period found in text, or 'Not Specified'",
    "penaltyOrDepositRisk": "exact penalty/deposit deduction risk found in text",
    "terminationFairness": "assessment of termination mutuality based on the text"
  },
  "clauses": [
    {
      "id": "c-1",
      "title": "Clause title",
      "severity": "red" | "yellow" | "green",
      "categoryTag": "Category tag",
      "originalQuote": "exact verbatim quote from the user's text",
      "plainEnglish": "plain English legal interpretation",
      "hinglishExplanation": "simple Hinglish explanation",
      "financialOrLegalImpact": "specific financial or legal impact",
      "recommendedFix": "exact redline wording or counter-proposal"
    }
  ],
  "missingProtections": ["important protective clause missing from the user's draft 1", "missing protection 2", "missing protection 3"],
  "negotiationScripts": {
    "whatsappPolite": "Polite ready-to-send English WhatsApp message referencing the exact issues found in this document",
    "whatsappHinglish": "Polite Hinglish WhatsApp message referencing the exact issues found in this document",
    "formalEmailSubject": "Formal email subject line for negotiating this document",
    "formalEmailBody": "Complete formal negotiation email body requesting redlines for the specific clauses found",
    "leveragePoints": ["Relevant Indian legal or commercial leverage point 1", "point 2"]
  }
}`;

  const llmJson = await tryLiveCloudLLM(prompt);
  if (llmJson) {
    try {
      const parsed = JSON.parse(llmJson);
      return {
        id: crypto.randomUUID(),
        documentTitle: documentTitle.trim() || `${category} Examination`,
        category,
        rawExcerpt: trimmed.slice(0, 240) + (trimmed.length > 240 ? "..." : ""),
        riskScore: Math.min(100, Math.max(0, Number(parsed.riskScore) || 50)),
        riskVerdict:
          parsed.riskVerdict || "Moderate Caution — Review Yellow Flags",
        executiveSummary: parsed.executiveSummary || "Examination completed.",
        hinglishSummary:
          parsed.hinglishSummary ||
          "Is document ka vishleshan niche diya gaya hai.",
        estimatedFinancialExposure:
          parsed.estimatedFinancialExposure || "See clause analysis",
        keyMetrics: {
          lockInOrBondPeriod:
            parsed.keyMetrics?.lockInOrBondPeriod || "Not Specified",
          noticePeriod: parsed.keyMetrics?.noticePeriod || "Not Specified",
          penaltyOrDepositRisk:
            parsed.keyMetrics?.penaltyOrDepositRisk || "Not Specified",
          terminationFairness:
            parsed.keyMetrics?.terminationFairness || "Review Required",
        },
        clauses: Array.isArray(parsed.clauses) ? parsed.clauses : [],
        missingProtections: Array.isArray(parsed.missingProtections)
          ? parsed.missingProtections
          : [],
        negotiationScripts: {
          whatsappPolite: parsed.negotiationScripts?.whatsappPolite || "",
          whatsappHinglish: parsed.negotiationScripts?.whatsappHinglish || "",
          formalEmailSubject:
            parsed.negotiationScripts?.formalEmailSubject ||
            `Requested Clarifications — ${documentTitle}`,
          formalEmailBody: parsed.negotiationScripts?.formalEmailBody || "",
          leveragePoints: Array.isArray(
            parsed.negotiationScripts?.leveragePoints
          )
            ? parsed.negotiationScripts.leveragePoints
            : [],
        },
        createdAt: new Date().toISOString(),
        engineSource: "gemini-ai",
      };
    } catch {}
  }

  return analyzeUserTextDynamically({
    documentTitle: documentTitle.trim() || `${category} Examination`,
    category,
    rawText: trimmed,
  });
}

function analyzeUserTextDynamically(params: {
  documentTitle: string;
  category: ContractCategory;
  rawText: string;
}): ContractAuditResult {
  const { documentTitle, category, rawText } = params;
  const lower = rawText.toLowerCase();

  const segments = rawText
    .split(/\n{2,}|(?=(?:clause|section|article|\d+\.)\s)/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  const clauses: AuditedClause[] = [];
  let riskScore = 20;

  const rupeeMatches =
    rawText.match(
      /(?:₹|Rs\.?|INR)\s*[\d,]+(?:\s*(?:lakhs?|lacs?|crores?|pa|per month))?/gi
    ) || [];
  const durationMatches =
    rawText.match(/\b\d+\s*(?:months?|years?|days?|weeks?)\b/gi) || [];

  for (const seg of segments) {
    const segLow = seg.toLowerCase();
    const quote = seg.slice(0, 260) + (seg.length > 260 ? "..." : "");

    if (
      /bond|liquidated damages|forfeit|custody|original certificate|original degree|penalty|fine|withhold/.test(
        segLow
      )
    ) {
      riskScore += 26;
      clauses.push({
        id: `c-${clauses.length + 1}`,
        title: "Financial Penalty, Lock-In Bond, or Forfeiture Provision",
        severity: "red",
        categoryTag: "Financial Penalty & Coercion",
        originalQuote: quote,
        plainEnglish:
          "This provision in your submitted text imposes liquidated damages, deposit forfeiture, or document retention upon early exit. Under Section 74 of the Indian Contract Act, only reasonable proven loss is recoverable.",
        hinglishExplanation:
          "Aapke diye gaye text ke is hisse mein beech mein chhodne par penalty, bond ya deposit zabt karne ki shart hai. Indian Contract Act Section 74 ke tahat manmani penalty lagana valid nahi hota.",
        financialOrLegalImpact: rupeeMatches[0]
          ? `Direct exposure involving ${rupeeMatches[0]}`
          : "High financial exit liability",
        recommendedFix:
          "Amend this clause to make any recovery strictly pro-rata to actual documented expenses, and remove any forfeiture or certificate retention language.",
      });
    } else if (
      /notice|terminate|termination|evict|vacate|abscond|buyout|without assigning any reason/.test(
        segLow
      )
    ) {
      const isHarsh =
        /90\s*days|ninety|without notice|7\s*days|15\s*days|sole discretion|forfeit/.test(
          segLow
        );
      riskScore += isHarsh ? 18 : 8;
      clauses.push({
        id: `c-${clauses.length + 1}`,
        title: isHarsh
          ? "Asymmetric or Restrictive Termination & Notice Clause"
          : "Notice & Termination Procedure",
        severity: isHarsh ? "red" : "yellow",
        categoryTag: "Notice & Exit Mutuality",
        originalQuote: quote,
        plainEnglish:
          "Governs how either party can exit the agreement. Ensure the notice period and buyout rights are identical for both parties.",
        hinglishExplanation:
          "Yeh clause batata hai ki agreement kaise khatam ya exit kiya ja sakta hai. Dono parties ke liye notice period barabar hona zaroori hai.",
        financialOrLegalImpact: durationMatches[0]
          ? `Impacts ${durationMatches[0]} notice/tenure mobility`
          : "Affects exit timeline and mobility",
        recommendedFix:
          "Make the notice period mutually identical (e.g., 30 days for both sides) with a clear pro-rata notice buyout option.",
      });
    } else if (
      /deduct|painting|wear and tear|maintenance|unlimited revision|discretion|variable|arrears|escalation|15%|10%/.test(
        segLow
      )
    ) {
      riskScore += 16;
      clauses.push({
        id: `c-${clauses.length + 1}`,
        title: "Deduction, Discretionary Payout, or Escalation Term",
        severity: "yellow",
        categoryTag: "Commercial & Payment Terms",
        originalQuote: quote,
        plainEnglish:
          "Contains deductions, discretionary variable components, or rate escalations that can reduce your net payout or refund.",
        hinglishExplanation:
          "Is hisse mein deductions, discretionary payment ya escalation ki baat hai jisse aapke haath mein aane wale paise kam ho sakte hain.",
        financialOrLegalImpact:
          "Reduces net realized compensation or deposit refund",
        recommendedFix:
          "Cap deductions to actual documented bills, exclude normal wear-and-tear, and define objective milestones for payouts.",
      });
    } else if (
      /non-compete|intellectual property|exclusively|indemnity|liability|weekend|personal|confidential/.test(
        segLow
      )
    ) {
      riskScore += 14;
      clauses.push({
        id: `c-${clauses.length + 1}`,
        title: "Intellectual Property, Non-Compete, or Liability Covenant",
        severity: "yellow",
        categoryTag: "IP & Post-Exit Restraint",
        originalQuote: quote,
        plainEnglish:
          "Defines ownership of work product, indemnity, or post-termination restrictions. Note that post-employment non-compete clauses are generally void under Section 27 of the Indian Contract Act.",
        hinglishExplanation:
          "Yeh clause IP ownership, liability ya non-compete ke baare mein hai. India mein Section 27 ke tahat job ke baad ka non-compete enforce nahi hota.",
        financialOrLegalImpact: "Impacts future work rights and IP ownership",
        recommendedFix:
          "Limit IP assignment strictly to work paid for under this contract and cap total liability to fees actually received.",
      });
    } else {
      clauses.push({
        id: `c-${clauses.length + 1}`,
        title: `General Covenant (§${clauses.length + 1})`,
        severity: "green",
        categoryTag: "Standard Provision",
        originalQuote: quote,
        plainEnglish:
          "This section outlines general commercial terms without immediate predatory penalty triggers.",
        hinglishExplanation:
          "Is hisse mein samanya shartein di gayi hain jinmein koi seedha penalty trap nahi dikh raha.",
        financialOrLegalImpact: "Standard contractual obligation",
        recommendedFix:
          "Verify dates, amounts, and party names before execution.",
      });
    }
  }

  if (clauses.length === 0) {
    clauses.push({
      id: "c-1",
      title: "Submitted Clause Excerpt",
      severity: "yellow",
      categoryTag: category,
      originalQuote: rawText.slice(0, 260),
      plainEnglish:
        "The submitted text is brief. Ensure lock-in periods, mutual notice rights, and payment timelines are explicitly defined in writing.",
      hinglishExplanation:
        "Diya gaya text chhota hai. Sign karne se pehle notice period, payment timeline aur refund ki shartein written mein zaroor lein.",
      financialOrLegalImpact: "Verify omitted terms",
      recommendedFix:
        "Add explicit mutual termination and payment timeline clauses.",
    });
  }

  riskScore = Math.min(95, Math.max(15, riskScore));
  const riskVerdict =
    riskScore >= 68
      ? "High Risk — Negotiate Before Signing"
      : riskScore >= 35
      ? "Moderate Caution — Review Yellow Flags"
      : "Safe & Balanced Agreement";

  const redCount = clauses.filter((c) => c.severity === "red").length;
  const yellowCount = clauses.filter((c) => c.severity === "yellow").length;

  return {
    id: crypto.randomUUID(),
    documentTitle,
    category,
    rawExcerpt: rawText.slice(0, 240) + (rawText.length > 240 ? "..." : ""),
    riskScore,
    riskVerdict,
    executiveSummary: `Examination of "${documentTitle}" identified ${redCount} critical liability clause(s) and ${yellowCount} negotiable covenant(s) across ${clauses.length} examined section(s) (Overall Risk Index: ${riskScore}/100).`,
    hinglishSummary: `"${documentTitle}" ke vishleshan mein ${redCount} critical liability clauses aur ${yellowCount} negotiable points mile hain (Risk Score: ${riskScore}/100). Sign karne se pehle niche diye gaye redlines zaroor mangwayein.`,
    estimatedFinancialExposure:
      rupeeMatches.length > 0
        ? `Involves ${rupeeMatches.slice(0, 2).join(" / ")} exposure`
        : riskScore >= 68
        ? "High Contractual Liability Exposure"
        : "Moderate Contractual Exposure",
    keyMetrics: {
      lockInOrBondPeriod:
        durationMatches.find((d) => /month|year/i.test(d)) ||
        (lower.includes("bond") ? "Bond Clause Present" : "Not Explicitly Capped"),
      noticePeriod:
        durationMatches.find((d) => /day|month/i.test(d)) ||
        (lower.includes("notice") ? "Notice Clause Present" : "Not Specified"),
      penaltyOrDepositRisk:
        rupeeMatches[0] ||
        (redCount > 0 ? "Penalty Clause Flagged" : "Low / Standard"),
      terminationFairness:
        redCount > 0 ? "Asymmetric — Requires Redline" : "Review Reciprocity",
    },
    clauses,
    missingProtections: [
      "Explicit reciprocal termination notice period giving both parties equal exit rights.",
      "Documented cap on any deductions/damages tied strictly to actual proven expenses.",
      "Fixed timeline (e.g., 7–15 days) for full & final settlement or security deposit refund.",
    ],
    negotiationScripts: {
      whatsappPolite: `Hi, thank you for sharing the "${documentTitle}". I have reviewed the draft and would like to align on ${
        redCount + yellowCount || "a few"
      } standard points before signing—specifically ensuring mutual notice terms and capping any penalties/deductions to documented actuals. Let me know when we can connect briefly to finalize this!`,
      whatsappHinglish: `Hi, "${documentTitle}" share karne ke liye shukriya! Maine draft padh liya hai. Sign karne se pehle bas ${
        redCount + yellowCount || "2-3"
      } points (notice period mutuality aur penalty/deductions cap) ko standardize kar lete hain. Bataiye kab 5 min call par final kar sakte hain!`,
      formalEmailSubject: `Requested Clause Amendments — ${documentTitle}`,
      formalEmailBody: `Dear Team,\n\nThank you for sharing the draft for "${documentTitle}". I have reviewed the terms and am keen to proceed.\n\nPrior to execution, please incorporate the following amendments based on the examined clauses:\n${clauses
        .filter((c) => c.severity !== "green")
        .slice(0, 4)
        .map((c, idx) => `${idx + 1}. ${c.title}: ${c.recommendedFix}`)
        .join("\n")}\n\nPlease share the updated agreement so we can execute it promptly.\n\nWarm regards,\n[Your Name]`,
      leveragePoints: [
        "Section 74 of the Indian Contract Act, 1872 restricts penalty recovery to reasonable, proven actual loss rather than arbitrary liquidated sums.",
        "Section 27 of the Indian Contract Act renders post-termination restraint of trade (blanket non-compete) void.",
      ],
    },
    createdAt: new Date().toISOString(),
    engineSource: "heuristic-legal-engine",
  };
}

export async function compareContractsWithAI(params: {
  docATitle: string;
  docAText: string;
  docBTitle: string;
  docBText: string;
}): Promise<ContractComparisonResult> {
  const { docATitle, docAText, docBTitle, docBText } = params;

  const prompt = `Compare these two user-submitted agreements/offers side-by-side under Indian legal and financial standards and determine which instrument is safer and more favorable.

Instrument A (${docATitle}):
"""
${docAText.slice(0, 10000)}
"""

Instrument B (${docBTitle}):
"""
${docBText.slice(0, 10000)}
"""

Return ONLY valid JSON matching:
{
  "docARiskScore": number (0 to 100),
  "docBRiskScore": number (0 to 100),
  "winner": "A" | "B",
  "winnerName": "string",
  "verdictSummary": "2-3 sentences English comparative legal verdict",
  "hinglishVerdict": "2-3 sentences Hinglish comparative verdict",
  "financialDifferenceEstimate": "summary of financial/liability difference between A and B",
  "rows": [
    {
      "parameter": "Covenant / Parameter name",
      "docAValue": "What Instrument A states",
      "docBValue": "What Instrument B states",
      "betterOption": "A" | "B" | "Tie",
      "whyItMatters": "1 sentence explanation of legal/financial impact"
    }
  ]
}`;

  const llmJson = await tryLiveCloudLLM(prompt);
  if (llmJson) {
    try {
      const parsed = JSON.parse(llmJson);
      return {
        id: crypto.randomUUID(),
        comparisonTitle: `${docATitle} vs ${docBTitle}`,
        docATitle,
        docBTitle,
        docARiskScore: Number(parsed.docARiskScore) || 50,
        docBRiskScore: Number(parsed.docBRiskScore) || 50,
        winner: parsed.winner === "A" ? "A" : "B",
        winnerName:
          parsed.winnerName || (parsed.winner === "A" ? docATitle : docBTitle),
        verdictSummary: parsed.verdictSummary || "Comparison completed.",
        hinglishVerdict:
          parsed.hinglishVerdict || "Dono documents ka comparison niche dekhein.",
        financialDifferenceEstimate:
          parsed.financialDifferenceEstimate || "See comparison schedule below",
        rows: Array.isArray(parsed.rows) ? parsed.rows : [],
        createdAt: new Date().toISOString(),
      };
    } catch {}
  }

  const auditA = analyzeUserTextDynamically({
    documentTitle: docATitle,
    category: "Job Offer Letter",
    rawText: docAText,
  });
  const auditB = analyzeUserTextDynamically({
    documentTitle: docBTitle,
    category: "Job Offer Letter",
    rawText: docBText,
  });

  const winner = auditA.riskScore <= auditB.riskScore ? "A" : "B";
  const winnerName = winner === "A" ? docATitle : docBTitle;

  return {
    id: crypto.randomUUID(),
    comparisonTitle: `${docATitle} vs ${docBTitle}`,
    docATitle,
    docBTitle,
    docARiskScore: auditA.riskScore,
    docBRiskScore: auditB.riskScore,
    winner,
    winnerName,
    verdictSummary: `${winnerName} carries lower legal and financial risk (${
      winner === "A" ? auditA.riskScore : auditB.riskScore
    }/100 vs ${winner === "A" ? auditB.riskScore : auditA.riskScore}/100).`,
    hinglishVerdict: `${winnerName} zyada safe aur balanced option hai kyunki ismein Risk Score kam hai.`,
    financialDifferenceEstimate: `${Math.abs(
      auditA.riskScore - auditB.riskScore
    )} Points Risk Index Difference`,
    rows: [
      {
        parameter: "Overall Risk Index",
        docAValue: `${auditA.riskScore}/100 (${auditA.riskVerdict})`,
        docBValue: `${auditB.riskScore}/100 (${auditB.riskVerdict})`,
        betterOption: winner,
        whyItMatters: "Lower risk index indicates fewer restrictive traps.",
      },
      {
        parameter: "Lock-In / Bond Exposure",
        docAValue: auditA.keyMetrics.lockInOrBondPeriod,
        docBValue: auditB.keyMetrics.lockInOrBondPeriod,
        betterOption: winner,
        whyItMatters: "Determines freedom to exit without penalty.",
      },
      {
        parameter: "Notice Period",
        docAValue: auditA.keyMetrics.noticePeriod,
        docBValue: auditB.keyMetrics.noticePeriod,
        betterOption: winner,
        whyItMatters: "Shorter, mutual notice periods protect career mobility.",
      },
      {
        parameter: "Financial Liability / Deductions",
        docAValue: auditA.keyMetrics.penaltyOrDepositRisk,
        docBValue: auditB.keyMetrics.penaltyOrDepositRisk,
        betterOption: winner,
        whyItMatters: "Direct financial impact upon exit.",
      },
    ],
    createdAt: new Date().toISOString(),
  };
}

export async function askContractQuestionWithAI(params: {
  question: string;
  audit: ContractAuditResult;
}): Promise<{
  answerEnglish: string;
  answerHinglish: string;
  actionTip: string;
}> {
  const { question, audit } = params;

  const prompt = `Answer the user's question about their examined ${audit.category} ("${audit.documentTitle}").
Executive Summary: ${audit.executiveSummary}
Examined Clauses: ${JSON.stringify(audit.clauses)}

User Question: "${question}"

Return ONLY valid JSON:
{
  "answerEnglish": "Clear, direct 2-3 sentence legal/practical answer based on the contract and Indian law",
  "answerHinglish": "Clear 2-sentence Hinglish explanation",
  "actionTip": "1 concrete step the user should take right now"
}`;

  const llmJson = await tryLiveCloudLLM(prompt);
  if (llmJson) {
    try {
      const parsed = JSON.parse(llmJson);
      return {
        answerEnglish: parsed.answerEnglish || "",
        answerHinglish: parsed.answerHinglish || "",
        actionTip: parsed.actionTip || "",
      };
    } catch {}
  }

  const primary =
    audit.clauses.find((c) => c.severity === "red") || audit.clauses[0];
  return {
    answerEnglish: `Regarding "${question}" in "${audit.documentTitle}": ${
      primary?.plainEnglish || audit.executiveSummary
    }`,
    answerHinglish: `Aapke sawal ("${question}") ke sandarbh mein: ${
      primary?.hinglishExplanation || audit.hinglishSummary
    }`,
    actionTip:
      primary?.recommendedFix ||
      "Request a written clarification before signing.",
  };
}
