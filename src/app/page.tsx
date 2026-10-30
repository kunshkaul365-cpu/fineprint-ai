"use client";

import React, { useEffect, useState } from "react";
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  Upload,
  FileText,
  FolderOpen,
  Users,
  Send,
  Languages,
  ArrowUpRight,
  Download,
  BookOpen,
  FileSignature,
  MessageSquare,
} from "lucide-react";
import {
  ContractAuditResult,
  ContractCategory,
  UserProfileSignup,
} from "@/types/fineprint";
import RiskGauge from "@/components/RiskGauge";
import NegotiationPanel from "@/components/NegotiationPanel";
import CompareOffersView from "@/components/CompareOffersView";
import CommunityUsersWall from "@/components/CommunityUsersWall";
import AuthAndWaitlistModal, {
  AuthenticatedSessionUser,
} from "@/components/AuthAndWaitlistModal";
import { exportAuditAsPdf } from "@/lib/pdfExport";
import { MAX_CONTRACT_CHARS } from "@/lib/sanitize";

type ActiveTab = "scanner" | "compare" | "vault" | "users";
type OpinionSubTab = "clauses" | "negotiation" | "qa";

const GUEST_FREE_AUDIT_LIMIT = 3;
const AUTHENTICATED_AUDIT_LIMIT = 10;

export default function FinePrintApp() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("scanner");
  const [opinionSubTab, setOpinionSubTab] =
    useState<OpinionSubTab>("clauses");
  const [languageMode, setLanguageMode] = useState<"english" | "hinglish">(
    "english"
  );

  const [documentTitle, setDocumentTitle] = useState<string>("");
  const [category, setCategory] = useState<ContractCategory>(
    "Job Offer Letter"
  );
  const [rawText, setRawText] = useState<string>("");
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isParsingFile, setIsParsingFile] = useState<boolean>(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState<string>("");
  const [scanError, setScanError] = useState<string>("");

  const [activeAudit, setActiveAudit] = useState<ContractAuditResult | null>(
    null
  );
  const [auditVault, setAuditVault] = useState<ContractAuditResult[]>([]);

  const [users, setUsers] = useState<UserProfileSignup[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfileSignup | null>(
    null
  );
  const [sessionUser, setSessionUser] =
    useState<AuthenticatedSessionUser | null>(null);
  const [sessionAuditsUsed, setSessionAuditsUsed] = useState<number>(0);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<"auth" | "waitlist">(
    "waitlist"
  );

  const [qaQuestion, setQaQuestion] = useState<string>("");
  const [qaLoading, setQaLoading] = useState<boolean>(false);
  const [qaError, setQaError] = useState<string>("");
  const [qaAnswer, setQaAnswer] = useState<{
    answerEnglish: string;
    answerHinglish: string;
    actionTip: string;
  } | null>(null);

  const maxAllowedAudits =
    currentUser || sessionUser
      ? AUTHENTICATED_AUDIT_LIMIT
      : GUEST_FREE_AUDIT_LIMIT;

  useEffect(() => {
    const savedUser = localStorage.getItem("fineprint_current_user");
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch {}
    }

    const savedSession = localStorage.getItem("fineprint_auth_session");
    if (savedSession) {
      try {
        setSessionUser(JSON.parse(savedSession));
      } catch {}
    }

    const savedUsage = sessionStorage.getItem("fineprint_session_audits");
    if (savedUsage) {
      setSessionAuditsUsed(Number(savedUsage) || 0);
    }

    fetch("/api/audit")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.audits)) {
          setAuditVault(data.audits);
          if (data.audits.length > 0) {
            setActiveAudit(data.audits[0]);
          }
        }
      })
      .catch(() => {});

    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.users)) {
          setUsers(data.users);
        }
      })
      .catch(() => {});
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!documentTitle.trim()) {
      setDocumentTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
    setIsParsingFile(true);
    setUploadStatusMsg(`Extracting text from ${file.name}...`);
    setScanError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/parse-pdf", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.ok && data.extractedText) {
        setRawText(data.extractedText.slice(0, MAX_CONTRACT_CHARS));
        setUploadStatusMsg(`✓ Extracted clauses from ${file.name}`);
      } else {
        setScanError(data.error || "Could not parse uploaded file.");
        setUploadStatusMsg("");
      }
    } catch {
      setScanError("Failed to upload file for parsing.");
      setUploadStatusMsg("");
    } finally {
      setIsParsingFile(false);
    }
  };

  const handleRunAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sessionAuditsUsed >= maxAllowedAudits) {
      setAuthModalMode("waitlist");
      setAuthModalOpen(true);
      return;
    }

    if (!rawText || rawText.trim().length < 20) {
      setScanError(
        "Please upload a document or paste at least 20 characters of contract clauses."
      );
      return;
    }

    setIsScanning(true);
    setScanError("");
    setQaAnswer(null);

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentTitle: documentTitle.trim() || `${category} Examination`,
          category,
          rawText: rawText.slice(0, MAX_CONTRACT_CHARS),
          userEmail: sessionUser?.email || currentUser?.email,
          userName: sessionUser?.fullName || currentUser?.fullName,
        }),
      });
      const data = await res.json();

      if (!data.ok) {
        setScanError(data.error || "Examination failed.");
      } else if (data.audit) {
        setActiveAudit(data.audit);
        setOpinionSubTab("clauses");
        setAuditVault((prev) => [
          data.audit,
          ...prev.filter((a) => a.id !== data.audit.id),
        ]);

        const nextCount = sessionAuditsUsed + 1;
        setSessionAuditsUsed(nextCount);
        sessionStorage.setItem("fineprint_session_audits", String(nextCount));
      }
    } catch {
      setScanError("Network error while examining instrument.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qaQuestion.trim() || !activeAudit) return;
    setQaLoading(true);
    setQaError("");
    try {
      const res = await fetch("/api/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: qaQuestion.slice(0, 500),
          audit: activeAudit,
        }),
      });
      const data = await res.json();

      if (!data.ok) {
        setQaError(data.error || "Failed to get answer.");
      } else {
        setQaAnswer({
          answerEnglish: data.answerEnglish,
          answerHinglish: data.answerHinglish,
          actionTip: data.actionTip,
        });
      }
    } catch {
      setQaError("Network error while asking question.");
    } finally {
      setQaLoading(false);
    }
  };

  const handleExportReport = () => {
    if (!activeAudit) return;
    exportAuditAsPdf(activeAudit);
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-stone-900 flex flex-col">
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-[#FBF9F5]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-800 bg-stone-900 text-amber-200 shadow-2xs">
              <Scale className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-legal-serif text-lg font-bold tracking-tight text-stone-900">
                  FinePrint{" "}
                  <span className="font-normal italic text-amber-900">
                    Counsel
                  </span>
                </span>
                <span className="hidden sm:inline-block rounded border border-stone-300 bg-stone-100 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-stone-600">
                  Indian Contract Act Advisory
                </span>
              </div>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-1 rounded-lg border border-stone-200 bg-stone-100/80 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("scanner")}
              className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                activeTab === "scanner"
                  ? "bg-white text-stone-900 shadow-2xs font-semibold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              Document Examination
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("compare")}
              className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                activeTab === "compare"
                  ? "bg-white text-stone-900 shadow-2xs font-semibold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Scale className="h-3.5 w-3.5" />
              Comparative Schedule
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("vault")}
              className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                activeTab === "vault"
                  ? "bg-white text-stone-900 shadow-2xs font-semibold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <FolderOpen className="h-3.5 w-3.5" />
              Case Docket ({auditVault.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                activeTab === "users"
                  ? "bg-white text-stone-900 shadow-2xs font-semibold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Client Registry ({users.length})
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setLanguageMode((prev) =>
                  prev === "english" ? "hinglish" : "english"
                )
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-800 hover:bg-stone-50 transition cursor-pointer"
              title="Toggle between Plain English and Simple Hinglish Counsel Notes"
            >
              <Languages className="h-3.5 w-3.5 text-amber-800" />
              {languageMode === "english"
                ? "Language: English"
                : "Language: Hinglish"}
            </button>
          </div>
        </div>
      </header>

      <AuthAndWaitlistModal
        isOpen={authModalOpen}
        mode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
        sessionUser={sessionUser}
        onAuthenticated={(user) => {
          setSessionUser(user);
          localStorage.setItem("fineprint_auth_session", JSON.stringify(user));
          fetch("/api/users")
            .then((r) => r.json())
            .then((d) => {
              if (d.ok && Array.isArray(d.users)) setUsers(d.users);
            })
            .catch(() => {});
        }}
        onSignOut={() => {
          setSessionUser(null);
          localStorage.removeItem("fineprint_auth_session");
        }}
        auditsUsed={sessionAuditsUsed}
        maxFreeAudits={maxAllowedAudits}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {activeTab === "scanner" && (
          <div className="grid grid-cols-1 gap-7 lg:grid-cols-12 items-start">
            <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-4">
              <div className="rounded-xl border border-stone-200/90 bg-white p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div>
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-amber-800">
                      Filing Desk
                    </span>
                    <h2 className="font-legal-serif text-lg font-semibold text-stone-900">
                      Submit Instrument for Examination
                    </h2>
                  </div>

                  <label className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-stone-50 px-2.5 py-1.5 text-[11px] font-medium text-stone-700 hover:bg-stone-100 transition cursor-pointer">
                    <Upload className="h-3 w-3 text-amber-800" />
                    {isParsingFile ? "Extracting..." : "Upload .PDF / .TXT"}
                    <input
                      type="file"
                      accept=".pdf,.txt,.md,.json,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {uploadStatusMsg && (
                  <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 font-mono text-[11px] text-stone-700">
                    {uploadStatusMsg}
                  </div>
                )}

                <form onSubmit={handleRunAudit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Instrument Title
                    </label>
                    <input
                      type="text"
                      maxLength={140}
                      value={documentTitle}
                      onChange={(e) => setDocumentTitle(e.target.value)}
                      placeholder="e.g., Software Engineer Offer Letter / 2BHK Lease Agreement"
                      className="w-full rounded-lg border border-stone-300 bg-stone-50/50 px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Classification
                    </label>
                    <select
                      value={category}
                      onChange={(e) =>
                        setCategory(e.target.value as ContractCategory)
                      }
                      className="w-full rounded-lg border border-stone-300 bg-stone-50/50 px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
                    >
                      <option value="Job Offer Letter">
                        Employment Offer / Appointment Letter
                      </option>
                      <option value="Rent / Lease Agreement">
                        Residential Lease / Rent Agreement
                      </option>
                      <option value="Freelance / Client Contract">
                        Master Services / Freelance Contract
                      </option>
                      <option value="Loan / Terms of Service">
                        Commercial / Loan Terms
                      </option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-stone-700">
                        Contract Text & Clauses
                      </label>
                      <span className="font-mono text-[10px] text-stone-400">
                        {rawText.length} chars
                      </span>
                    </div>
                    <textarea
                      rows={11}
                      maxLength={MAX_CONTRACT_CHARS}
                      value={rawText}
                      onChange={(e) =>
                        setRawText(e.target.value.slice(0, MAX_CONTRACT_CHARS))
                      }
                      placeholder="Paste your employment offer letter, rental agreement, or freelance contract clauses here, or upload a .PDF / .TXT file above..."
                      className="w-full rounded-lg border border-stone-300 bg-[#FCFBF9] p-3 font-mono text-xs leading-relaxed text-stone-800 focus:border-stone-900 focus:bg-white focus:outline-none"
                    />
                  </div>

                  {scanError && (
                    <p className="text-xs font-medium text-red-700 leading-relaxed">
                      {scanError}
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={isScanning}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50 transition cursor-pointer"
                    >
                      <Scale className="h-3.5 w-3.5 text-amber-200" />
                      {isScanning
                        ? "Examining Instrument with Gemini AI..."
                        : "Examine Instrument & Issue Opinion"}
                    </button>

                    {activeAudit && (
                      <button
                        type="button"
                        onClick={handleExportReport}
                        title="Download Written Legal Memorandum (.PDF)"
                        className="inline-flex items-center justify-center rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-xs font-medium text-stone-700 hover:bg-stone-50 transition cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-5">
              {!activeAudit ? (
                <div className="rounded-xl border border-dashed border-stone-300 bg-white/70 p-12 text-center space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-stone-200 bg-stone-100 text-stone-700">
                    <Scale className="h-5 w-5" />
                  </div>
                  <h3 className="font-legal-serif text-xl font-semibold text-stone-900">
                    Awaiting Instrument for Legal Examination
                  </h3>
                  <p className="mx-auto max-w-md text-xs leading-relaxed text-stone-600">
                    Upload a PDF/TXT document or paste your contract clauses in
                    the Filing Desk on the left, then click{" "}
                    <strong>Examine Instrument & Issue Opinion</strong> to
                    generate your live AI Risk Memorandum, Clause Breakdown, and
                    Counter-Proposal Drafts.
                  </p>
                </div>
              ) : (
                <>
                  <RiskGauge audit={activeAudit} languageMode={languageMode} />

                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3">
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setOpinionSubTab("clauses")}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
                          opinionSubTab === "clauses"
                            ? "bg-stone-900 text-white"
                            : "bg-white border border-stone-200 text-stone-600 hover:text-stone-900"
                        }`}
                      >
                        <FileText className="h-3.5 w-3.5" />
                        1. Clause Examination ({activeAudit.clauses.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => setOpinionSubTab("negotiation")}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
                          opinionSubTab === "negotiation"
                            ? "bg-stone-900 text-white"
                            : "bg-white border border-stone-200 text-stone-600 hover:text-stone-900"
                        }`}
                      >
                        <FileSignature className="h-3.5 w-3.5" />
                        2. Counter-Proposal & Redline Draft
                      </button>

                      <button
                        type="button"
                        onClick={() => setOpinionSubTab("qa")}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
                          opinionSubTab === "qa"
                            ? "bg-stone-900 text-white"
                            : "bg-white border border-stone-200 text-stone-600 hover:text-stone-900"
                        }`}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        3. Omissions & Counsel Q&A
                      </button>
                    </div>
                  </div>

                  {opinionSubTab === "clauses" && (
                    <div className="space-y-4">
                      {activeAudit.clauses.map((clause, index) => {
                        const isRed = clause.severity === "red";
                        const isYellow = clause.severity === "yellow";

                        return (
                          <div
                            key={clause.id || index}
                            className={`rounded-xl border border-stone-200 bg-white p-5 shadow-2xs border-l-4 ${
                              isRed
                                ? "border-l-red-700"
                                : isYellow
                                ? "border-l-amber-600"
                                : "border-l-emerald-700"
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-stone-500">
                                  § ARTICLE 0{index + 1}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                                    isRed
                                      ? "bg-red-50 text-red-900 border border-red-200"
                                      : isYellow
                                      ? "bg-amber-50 text-amber-900 border border-amber-200"
                                      : "bg-emerald-50 text-emerald-900 border border-emerald-200"
                                  }`}
                                >
                                  {isRed
                                    ? "Critical Liability"
                                    : isYellow
                                    ? "Negotiable Covenant"
                                    : "Balanced Provision"}
                                </span>
                                <span className="rounded bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">
                                  {clause.categoryTag}
                                </span>
                              </div>
                              <span className="font-mono text-[11px] font-medium text-stone-500">
                                {clause.financialOrLegalImpact}
                              </span>
                            </div>

                            <h3 className="mt-2 font-legal-serif text-lg font-semibold text-stone-900">
                              {clause.title}
                            </h3>

                            <blockquote className="mt-2.5 rounded-r border-l-2 border-stone-300 bg-stone-50/90 py-2 pl-3 pr-3 font-mono text-xs text-stone-600">
                              &ldquo;{clause.originalQuote}&rdquo;
                            </blockquote>

                            <div className="mt-3.5 space-y-2 text-sm text-stone-700">
                              <div>
                                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                                  {languageMode === "hinglish"
                                    ? "Counsel Interpretation (Hinglish):"
                                    : "Counsel Interpretation:"}
                                </span>
                                <p className="mt-0.5 leading-relaxed text-stone-800">
                                  {languageMode === "hinglish"
                                    ? clause.hinglishExplanation
                                    : clause.plainEnglish}
                                </p>
                              </div>

                              <div className="rounded-lg border border-stone-200/80 bg-[#FAF8F5] p-3 text-xs">
                                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                                  ✓ Proposed Redline Amendment:
                                </span>
                                <p className="mt-0.5 text-stone-800 font-medium">
                                  {clause.recommendedFix}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {opinionSubTab === "negotiation" && (
                    <NegotiationPanel audit={activeAudit} />
                  )}

                  {opinionSubTab === "qa" && (
                    <div className="space-y-5">
                      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-xs space-y-3">
                        <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-amber-900">
                          <AlertTriangle className="h-4 w-4 text-amber-700" />
                          Omitted Protective Covenants
                        </div>
                        <p className="text-xs text-stone-600">
                          Standard legal protections absent from the current
                          draft that should be inserted prior to execution:
                        </p>
                        <ul className="space-y-2 pt-1 text-sm text-stone-800">
                          {activeAudit.missingProtections.map((mp, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2.5 rounded-lg border border-stone-200 bg-stone-50/70 p-3 text-xs"
                            >
                              <span className="font-mono font-bold text-stone-500">
                                §0{idx + 1}.
                              </span>
                              <span>{mp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
                        <div>
                          <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-amber-800">
                            Interactive Advisory
                          </span>
                          <h3 className="font-legal-serif text-lg font-semibold text-stone-900">
                            Direct Inquiry on Examined Instrument
                          </h3>
                          <p className="text-xs text-stone-600">
                            Ask any specific question regarding enforceability,
                            early termination, or liability under Indian law:
                          </p>
                        </div>

                        <form onSubmit={handleAskQuestion} className="flex gap-2">
                          <input
                            type="text"
                            maxLength={500}
                            value={qaQuestion}
                            onChange={(e) => setQaQuestion(e.target.value)}
                            placeholder="Ask a specific question about this document..."
                            className="flex-1 rounded-lg border border-stone-300 bg-stone-50 px-3.5 py-2 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
                          />
                          <button
                            type="submit"
                            disabled={qaLoading}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50 cursor-pointer"
                          >
                            <Send className="h-3.5 w-3.5" />
                            {qaLoading ? "Reviewing..." : "Ask Counsel"}
                          </button>
                        </form>

                        {qaError && (
                          <p className="text-xs font-medium text-red-700">
                            {qaError}
                          </p>
                        )}

                        {qaAnswer && (
                          <div className="rounded-lg border border-stone-200 bg-[#FAF8F5] p-4 space-y-2 text-xs">
                            <p className="font-mono text-[10px] font-semibold uppercase text-stone-500">
                              Counsel Response:
                            </p>
                            <p className="text-sm text-stone-800 leading-relaxed">
                              {languageMode === "hinglish"
                                ? qaAnswer.answerHinglish
                                : qaAnswer.answerEnglish}
                            </p>
                            <div className="border-t border-stone-200 pt-2 text-emerald-900 font-medium flex items-center gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                              <span>
                                Recommended Action: {qaAnswer.actionTip}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === "compare" && (
          <CompareOffersView languageMode={languageMode} />
        )}

        {activeTab === "vault" && (
          <div className="space-y-5">
            <div className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-amber-800">
                  Database Archive
                </span>
                <h2 className="font-legal-serif text-2xl font-semibold text-stone-900">
                  Case Docket ({auditVault.length} Examined Instruments)
                </h2>
                <p className="text-xs text-stone-600">
                  All user-submitted contracts examined and stored in your
                  Supabase PostgreSQL database (`contract_audits` table).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("scanner")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-xs font-semibold text-white cursor-pointer"
              >
                Examine New Instrument
              </button>
            </div>

            {auditVault.length === 0 ? (
              <div className="rounded-xl border border-dashed border-stone-300 bg-white/60 p-12 text-center space-y-2">
                <p className="font-legal-serif text-lg font-medium text-stone-800">
                  No Examined Instruments in Database Yet
                </p>
                <p className="text-xs text-stone-500 max-w-md mx-auto">
                  Submit a contract in the Document Examination tab to save your
                  first audit record into Supabase PostgreSQL.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {auditVault.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between rounded-xl border border-stone-200 bg-white p-5 shadow-2xs hover:border-stone-300 transition"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] uppercase tracking-wider text-stone-500">
                          {item.category}
                        </span>
                        <span
                          className={`rounded border px-2 py-0.5 font-mono text-xs font-semibold ${
                            item.riskScore >= 68
                              ? "border-red-200 bg-red-50 text-red-900"
                              : item.riskScore >= 38
                              ? "border-amber-200 bg-amber-50 text-amber-900"
                              : "border-emerald-200 bg-emerald-50 text-emerald-900"
                          }`}
                        >
                          Risk Index: {item.riskScore}/100
                        </span>
                      </div>
                      <h3 className="font-legal-serif text-lg font-semibold text-stone-900">
                        {item.documentTitle}
                      </h3>
                      <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                        {languageMode === "hinglish"
                          ? item.hinglishSummary
                          : item.executiveSummary}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3">
                      <span className="font-mono text-[11px] text-stone-600">
                        {item.estimatedFinancialExposure}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveAudit(item);
                          setActiveTab("scanner");
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-stone-900 hover:underline cursor-pointer"
                      >
                        Open Memorandum
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "users" && (
          <CommunityUsersWall
            users={users}
            onUserRegistered={(updatedUsers, newUser) => {
              setUsers(updatedUsers);
              setCurrentUser(newUser);
              localStorage.setItem(
                "fineprint_current_user",
                JSON.stringify(newUser)
              );
            }}
          />
        )}
      </main>

      <footer className="mt-12 border-t border-stone-200 bg-[#F5F2EB] py-5 text-xs text-stone-600">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Scale className="h-3.5 w-3.5 text-stone-700" />
            <span>
              <strong>FinePrint Counsel</strong> — Automated Contract Risk &
              Redline Advisory
            </span>
          </div>
          <span className="font-mono text-[11px] text-stone-500">
            AI-Generated Analysis • Not a Substitute for Legal Advice • Indian
            Contract Act, 1872
          </span>
        </div>
      </footer>
    </div>
  );
}
