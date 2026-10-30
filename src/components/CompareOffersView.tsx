"use client";

import React, { useEffect, useState } from "react";
import {
  Scale,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Upload,
} from "lucide-react";
import { ContractComparisonResult } from "@/types/fineprint";

interface CompareOffersViewProps {
  languageMode: "english" | "hinglish";
}

export default function CompareOffersView({
  languageMode,
}: CompareOffersViewProps) {
  const [docATitle, setDocATitle] = useState("");
  const [docAText, setDocAText] = useState("");
  const [docBTitle, setDocBTitle] = useState("");
  const [docBText, setDocBText] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeComparison, setActiveComparison] =
    useState<ContractComparisonResult | null>(null);
  const [savedComparisons, setSavedComparisons] = useState<
    ContractComparisonResult[]
  >([]);

  useEffect(() => {
    fetch("/api/compare")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.comparisons)) {
          setSavedComparisons(data.comparisons);
          if (data.comparisons.length > 0) {
            setActiveComparison(data.comparisons[0]);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleFileUpload = async (
    side: "A" | "B",
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg("");

    const cleanName = file.name.replace(/\.[^/.]+$/, "");
    if (side === "A" && !docATitle) setDocATitle(cleanName);
    if (side === "B" && !docBTitle) setDocBTitle(cleanName);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/parse-pdf", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.ok && data.extractedText) {
        if (side === "A") setDocAText(data.extractedText);
        else setDocBText(data.extractedText);
      } else {
        setErrorMsg(data.error || "Could not extract text from uploaded file.");
      }
    } catch {
      setErrorMsg("Error uploading document for comparison.");
    }
  };

  const handleRunComparison = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docAText.trim() || !docBText.trim()) {
      setErrorMsg(
        "Please enter or upload text for both Instrument A and Instrument B."
      );
      return;
    }

    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docATitle: docATitle.trim() || "Instrument A",
          docAText,
          docBTitle: docBTitle.trim() || "Instrument B",
          docBText,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErrorMsg(data.error || "Comparison failed.");
      } else if (data.comparison) {
        setActiveComparison(data.comparison);
        setSavedComparisons((prev) => [data.comparison, ...prev]);
      }
    } catch {
      setErrorMsg("Network error while running comparison.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-xs">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-amber-800">
          Comparative Legal Schedule
        </span>
        <h2 className="mt-1 font-legal-serif text-2xl font-semibold text-stone-900">
          Side-by-Side Instrument Comparison
        </h2>
        <p className="mt-0.5 text-xs text-stone-600">
          Upload or paste two competing employment offers, rental leases, or
          vendor agreements to compare liability, lock-in, and financial risk.
        </p>
      </div>

      <form
        onSubmit={handleRunComparison}
        className="rounded-xl border border-stone-200 bg-white p-6 shadow-xs space-y-5"
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-mono text-xs font-semibold uppercase tracking-wider text-stone-800">
                Instrument A
              </label>
              <label className="inline-flex items-center gap-1.5 rounded border border-stone-300 bg-stone-50 px-2.5 py-1 text-[11px] font-medium text-stone-700 hover:bg-stone-100 cursor-pointer">
                <Upload className="h-3 w-3 text-amber-800" />
                Upload PDF / TXT
                <input
                  type="file"
                  accept=".pdf,.txt,.md"
                  onChange={(e) => handleFileUpload("A", e)}
                  className="hidden"
                />
              </label>
            </div>
            <input
              type="text"
              value={docATitle}
              onChange={(e) => setDocATitle(e.target.value)}
              placeholder="e.g., Offer A — Company Name / Flat A"
              className="w-full rounded-lg border border-stone-300 bg-stone-50/60 px-3.5 py-2 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
            />
            <textarea
              rows={7}
              value={docAText}
              onChange={(e) => setDocAText(e.target.value)}
              placeholder="Paste full text or clauses of Instrument A here..."
              className="w-full rounded-lg border border-stone-300 bg-[#FCFBF9] p-3 font-mono text-xs text-stone-800 focus:border-stone-900 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-mono text-xs font-semibold uppercase tracking-wider text-stone-800">
                Instrument B
              </label>
              <label className="inline-flex items-center gap-1.5 rounded border border-stone-300 bg-stone-50 px-2.5 py-1 text-[11px] font-medium text-stone-700 hover:bg-stone-100 cursor-pointer">
                <Upload className="h-3 w-3 text-amber-800" />
                Upload PDF / TXT
                <input
                  type="file"
                  accept=".pdf,.txt,.md"
                  onChange={(e) => handleFileUpload("B", e)}
                  className="hidden"
                />
              </label>
            </div>
            <input
              type="text"
              value={docBTitle}
              onChange={(e) => setDocBTitle(e.target.value)}
              placeholder="e.g., Offer B — Company Name / Flat B"
              className="w-full rounded-lg border border-stone-300 bg-stone-50/60 px-3.5 py-2 text-xs text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
            />
            <textarea
              rows={7}
              value={docBText}
              onChange={(e) => setDocBText(e.target.value)}
              placeholder="Paste full text or clauses of Instrument B here..."
              className="w-full rounded-lg border border-stone-300 bg-[#FCFBF9] p-3 font-mono text-xs text-stone-800 focus:border-stone-900 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {errorMsg && (
          <p className="text-xs font-medium text-red-700">{errorMsg}</p>
        )}

        <div className="flex items-center justify-between pt-1">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50 cursor-pointer"
          >
            <Scale className="h-4 w-4 text-amber-200" />
            {loading
              ? "Comparing Instruments with Gemini AI..."
              : "Compare Both Instruments"}
            <ArrowRight className="h-4 w-4" />
          </button>

          {savedComparisons.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-stone-500">
                Past Comparisons:
              </span>
              <select
                value={activeComparison?.id || ""}
                onChange={(e) => {
                  const found = savedComparisons.find(
                    (c) => c.id === e.target.value
                  );
                  if (found) setActiveComparison(found);
                }}
                className="rounded border border-stone-300 bg-stone-50 px-2.5 py-1 text-xs text-stone-800"
              >
                {savedComparisons.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.comparisonTitle}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </form>

      {activeComparison && (
        <>
          <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-xs">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2 max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                  Counsel Recommendation: {activeComparison.winnerName}
                </div>
                <h3 className="font-legal-serif text-xl font-semibold text-stone-900">
                  {activeComparison.comparisonTitle}
                </h3>
                <p className="text-sm text-stone-700 leading-relaxed">
                  {languageMode === "hinglish"
                    ? activeComparison.hinglishVerdict
                    : activeComparison.verdictSummary}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-center">
                  <p className="font-mono text-[10px] uppercase text-stone-500">
                    Option A Risk
                  </p>
                  <p className="font-legal-serif text-2xl font-bold text-stone-900">
                    {activeComparison.docARiskScore}/100
                  </p>
                </div>
                <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-center">
                  <p className="font-mono text-[10px] uppercase text-stone-500">
                    Option B Risk
                  </p>
                  <p className="font-legal-serif text-2xl font-bold text-stone-900">
                    {activeComparison.docBRiskScore}/100
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-100/80 font-mono text-[11px] uppercase tracking-wider text-stone-600">
                    <th className="p-4">Covenant / Term</th>
                    <th className="p-4">{activeComparison.docATitle}</th>
                    <th className="p-4">{activeComparison.docBTitle}</th>
                    <th className="p-4">Counsel Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 text-sm">
                  {activeComparison.rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-stone-50/80">
                      <td className="p-4 font-semibold text-stone-900">
                        {row.parameter}
                      </td>
                      <td className="p-4">
                        <div className="flex items-start gap-2">
                          {row.betterOption === "A" ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                          ) : (
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                          )}
                          <span
                            className={
                              row.betterOption === "A"
                                ? "text-emerald-900 font-medium"
                                : "text-stone-700"
                            }
                          >
                            {row.docAValue}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-start gap-2">
                          {row.betterOption === "B" ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                          ) : (
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                          )}
                          <span
                            className={
                              row.betterOption === "B"
                                ? "text-emerald-900 font-medium"
                                : "text-stone-700"
                            }
                          >
                            {row.docBValue}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-xs text-stone-600">
                        {row.whyItMatters}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
