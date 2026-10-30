import { jsPDF } from "jspdf";
import { ContractAuditResult } from "@/types/fineprint";

export function exportAuditAsPdf(audit: ContractAuditResult): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = 18;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageHeight - 20) {
      doc.addPage();
      y = 18;
    }
  };

  doc.setFillColor(28, 25, 23);
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setTextColor(253, 230, 138);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("FINEPRINT COUNSEL — LEGAL RISK MEMORANDUM", margin, 13);

  doc.setTextColor(214, 211, 209);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(
    `Generated: ${new Date(audit.createdAt).toLocaleDateString("en-IN")}  |  Category: ${audit.category}  |  Indian Contract Act, 1872 Reference`,
    margin,
    21
  );

  y = 36;

  doc.setTextColor(28, 25, 23);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  const titleLines = doc.splitTextToSize(audit.documentTitle, contentWidth - 45);
  doc.text(titleLines, margin, y);

  const badgeX = pageWidth - margin - 40;
  doc.setFillColor(
    audit.riskScore >= 68 ? 254 : audit.riskScore >= 38 ? 254 : 236,
    audit.riskScore >= 68 ? 226 : audit.riskScore >= 38 ? 243 : 253,
    audit.riskScore >= 68 ? 226 : audit.riskScore >= 38 ? 199 : 245
  );
  doc.roundedRect(badgeX, y - 5, 40, 18, 2, 2, "F");
  doc.setFontSize(12);
  doc.setTextColor(
    audit.riskScore >= 68 ? 153 : audit.riskScore >= 38 ? 146 : 6,
    audit.riskScore >= 68 ? 27 : audit.riskScore >= 38 ? 64 : 95,
    audit.riskScore >= 68 ? 27 : audit.riskScore >= 38 ? 14 : 70
  );
  doc.text(`RISK: ${audit.riskScore}/100`, badgeX + 5, y + 3);
  doc.setFontSize(7);
  doc.text(audit.riskVerdict.slice(0, 22), badgeX + 5, y + 9);

  y += Math.max(titleLines.length * 6, 16) + 4;

  doc.setDrawColor(214, 211, 209);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setTextColor(28, 25, 23);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("EXECUTIVE OPINION (ENGLISH)", margin, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const execLines = doc.splitTextToSize(
    audit.executiveSummary.replace(/₹/g, "INR "),
    contentWidth
  );
  doc.text(execLines, margin, y);
  y += execLines.length * 4.5 + 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("COUNSEL SUMMARY (HINGLISH)", margin, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const hinglishLines = doc.splitTextToSize(
    audit.hinglishSummary.replace(/₹/g, "INR "),
    contentWidth
  );
  doc.text(hinglishLines, margin, y);
  y += hinglishLines.length * 4.5 + 6;

  ensureSpace(26);
  doc.setFillColor(245, 245, 244);
  doc.roundedRect(margin, y, contentWidth, 20, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(87, 83, 78);
  doc.text(
    `Lock-In / Bond: ${audit.keyMetrics.lockInOrBondPeriod.replace(/₹/g, "INR ")}`,
    margin + 4,
    y + 7
  );
  doc.text(
    `Notice Period: ${audit.keyMetrics.noticePeriod.replace(/₹/g, "INR ")}`,
    margin + 92,
    y + 7
  );
  doc.text(
    `Financial Liability: ${audit.keyMetrics.penaltyOrDepositRisk.replace(/₹/g, "INR ")}`,
    margin + 4,
    y + 15
  );
  doc.text(
    `Exit Mutuality: ${audit.keyMetrics.terminationFairness.replace(/₹/g, "INR ")}`,
    margin + 92,
    y + 15
  );
  y += 27;

  doc.setTextColor(28, 25, 23);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text(`EXAMINED ARTICLES & CLAUSES (${audit.clauses.length})`, margin, y);
  y += 6;

  audit.clauses.forEach((clause, idx) => {
    const quoteLines = doc.splitTextToSize(
      `"${clause.originalQuote.replace(/₹/g, "INR ")}"`,
      contentWidth - 8
    );
    const analysisLines = doc.splitTextToSize(
      `Analysis: ${clause.plainEnglish.replace(/₹/g, "INR ")}`,
      contentWidth - 8
    );
    const fixLines = doc.splitTextToSize(
      `Proposed Redline: ${clause.recommendedFix.replace(/₹/g, "INR ")}`,
      contentWidth - 8
    );

    const blockHeight =
      14 +
      quoteLines.length * 4 +
      analysisLines.length * 4 +
      fixLines.length * 4;
    ensureSpace(blockHeight);

    doc.setDrawColor(214, 211, 209);
    doc.roundedRect(margin, y, contentWidth, blockHeight - 2, 1.5, 1.5, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(
      clause.severity === "red"
        ? 153
        : clause.severity === "yellow"
        ? 146
        : 22,
      clause.severity === "red"
        ? 27
        : clause.severity === "yellow"
        ? 64
        : 101,
      clause.severity === "red" ? 27 : clause.severity === "yellow" ? 14 : 52
    );
    doc.text(
      `Article 0${idx + 1} [${clause.severity.toUpperCase()}] — ${clause.title.replace(/₹/g, "INR ")}`,
      margin + 4,
      y + 6
    );

    let cy = y + 11;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(87, 83, 78);
    doc.text(quoteLines, margin + 4, cy);
    cy += quoteLines.length * 4 + 1;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(28, 25, 23);
    doc.text(analysisLines, margin + 4, cy);
    cy += analysisLines.length * 4 + 1;

    doc.setFont("helvetica", "bold");
    doc.setTextColor(6, 95, 70);
    doc.text(fixLines, margin + 4, cy);

    y += blockHeight + 3;
  });

  ensureSpace(45);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(28, 25, 23);
  doc.text("PROPOSED REDLINE & NEGOTIATION CORRESPONDENCE", margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const emailLines = doc.splitTextToSize(
    `Subject: ${audit.negotiationScripts.formalEmailSubject}\n\n${audit.negotiationScripts.formalEmailBody}`.replace(
      /₹/g,
      "INR "
    ),
    contentWidth
  );
  ensureSpace(emailLines.length * 4 + 10);
  doc.text(emailLines, margin, y);
  y += emailLines.length * 4 + 8;

  ensureSpace(20);
  doc.setDrawColor(214, 211, 209);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(120, 113, 108);
  const disclaimerLines = doc.splitTextToSize(
    "STATUTORY LEGAL DISCLAIMER: This report is generated by FinePrint Counsel AI for informational and educational purposes only. It does not constitute formal legal advice, solicitation, or an advocate-client relationship under the Advocates Act, 1961 (Bar Council of India). Please consult a qualified legal practitioner before executing high-liability contracts.",
    contentWidth
  );
  doc.text(disclaimerLines, margin, y);

  const safeSlug = audit.documentTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  doc.save(`${safeSlug || "fineprint"}-legal-memorandum.pdf`);
}
