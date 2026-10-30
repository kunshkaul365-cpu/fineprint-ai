"use client";

import React from "react";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { ContractAuditResult } from "@/types/fineprint";

interface RiskGaugeProps {
  audit: ContractAuditResult;
  languageMode: "english" | "hinglish";
}

export default function RiskGauge({ audit, languageMode }: RiskGaugeProps) {
  const score = audit.riskScore;
  const isHigh = score >= 68;
  const isMedium = score >= 38 && score < 68;

  const redCount = audit.clauses.filter((c) => c.severity === "red").length;
  const yellowCount = audit.clauses.filter(
    (c) => c.severity === "yellow"
  ).length;
  const greenCount = audit.clauses.filter((c) => c.severity === "green").length;

  return (
    <div className="rounded-xl border border-stone-200/90 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 bg-stone-100/70 px-6 py-3 text-xs text-stone-600">
        <div className="flex items-center gap-2 font-mono uppercase tracking-wider text-[11px]">
          <span className="font-semibold text-stone-800">
            COUNSEL MEMORANDUM
          </span>
          <span>•</span>
          <span>MATTER: {audit.category.toUpperCase()}</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] font-medium">
          <span className="text-red-800">● {redCount} Critical Liability</span>
          <span className="text-amber-800">● {yellowCount} Negotiable</span>
          <span className="text-emerald-800">● {greenCount} Standard</span>
        </div>
      </div>

      <div className="p-6 sm:p-7">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold tracking-wide uppercase border ${
                  isHigh
                    ? "bg-red-50 text-red-900 border-red-200"
                    : isMedium
                    ? "bg-amber-50 text-amber-900 border-amber-200"
                    : "bg-emerald-50 text-emerald-900 border-emerald-200"
                }`}
              >
                {isHigh ? (
                  <ShieldAlert className="h-3.5 w-3.5 text-red-700" />
                ) : isMedium ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                )}
                {audit.riskVerdict}
              </span>
            </div>

            <h2 className="font-legal-serif text-2xl font-semibold text-stone-900 leading-snug">
              {audit.documentTitle}
            </h2>

            <p className="text-sm leading-relaxed text-stone-700">
              {languageMode === "hinglish"
                ? audit.hinglishSummary
                : audit.executiveSummary}
            </p>
          </div>

          <div
            className={`flex flex-col items-center justify-center rounded-lg border px-6 py-4 text-center shrink-0 min-w-[160px] ${
              isHigh
                ? "border-red-200 bg-red-50/50"
                : isMedium
                ? "border-amber-200 bg-amber-50/50"
                : "border-emerald-200 bg-emerald-50/50"
            }`}
          >
            <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-stone-500">
              Risk Index
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span
                className={`font-legal-serif text-4xl font-bold ${
                  isHigh
                    ? "text-red-800"
                    : isMedium
                    ? "text-amber-800"
                    : "text-emerald-800"
                }`}
              >
                {score}
              </span>
              <span className="text-xs font-mono text-stone-500">/100</span>
            </div>
            <span className="mt-1.5 text-[11px] font-medium text-stone-600 max-w-[150px] leading-tight">
              {audit.estimatedFinancialExposure}
            </span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-stone-200 pt-5 sm:grid-cols-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-stone-500">
              § Lock-In / Bond
            </p>
            <p className="mt-1 text-xs font-semibold text-stone-900">
              {audit.keyMetrics.lockInOrBondPeriod}
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-stone-500">
              § Notice Requirement
            </p>
            <p className="mt-1 text-xs font-semibold text-stone-900">
              {audit.keyMetrics.noticePeriod}
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-stone-500">
              § Financial Liability
            </p>
            <p className="mt-1 text-xs font-semibold text-stone-900">
              {audit.keyMetrics.penaltyOrDepositRisk}
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-stone-500">
              § Mutuality of Exit
            </p>
            <p className="mt-1 text-xs font-semibold text-stone-900">
              {audit.keyMetrics.terminationFairness}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
