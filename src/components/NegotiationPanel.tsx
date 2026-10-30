"use client";

import React, { useState } from "react";
import {
  Copy,
  Check,
  MessageSquare,
  Mail,
  Scale,
  Send,
  FileSignature,
} from "lucide-react";
import { ContractAuditResult } from "@/types/fineprint";

interface NegotiationPanelProps {
  audit: ContractAuditResult;
}

export default function NegotiationPanel({ audit }: NegotiationPanelProps) {
  const [channel, setChannel] = useState<
    "formalEmail" | "whatsappPolite" | "whatsappHinglish"
  >("formalEmail");
  const [copied, setCopied] = useState(false);

  const scripts = audit.negotiationScripts;

  const activeText =
    channel === "whatsappPolite"
      ? scripts.whatsappPolite
      : channel === "whatsappHinglish"
      ? scripts.whatsappHinglish
      : `Subject: ${scripts.formalEmailSubject}\n\n${scripts.formalEmailBody}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(activeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const encoded = encodeURIComponent(activeText);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  const handleMailto = () => {
    const subject = encodeURIComponent(scripts.formalEmailSubject);
    const body = encodeURIComponent(scripts.formalEmailBody);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-stone-200 bg-stone-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-amber-800">
              <FileSignature className="h-3.5 w-3.5" />
              Draft Counter-Proposal Correspondence
            </div>
            <h3 className="mt-1 font-legal-serif text-lg font-semibold text-stone-900">
              Proposed Redline & Amendment Request
            </h3>
          </div>

          <div className="inline-flex rounded-lg border border-stone-200 bg-stone-100 p-1">
            <button
              type="button"
              onClick={() => setChannel("formalEmail")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                channel === "formalEmail"
                  ? "bg-white text-stone-900 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Mail className="h-3.5 w-3.5" />
              Formal Legal / HR Email
            </button>
            <button
              type="button"
              onClick={() => setChannel("whatsappPolite")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                channel === "whatsappPolite"
                  ? "bg-white text-stone-900 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              WhatsApp (English)
            </button>
            <button
              type="button"
              onClick={() => setChannel("whatsappHinglish")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                channel === "whatsappHinglish"
                  ? "bg-white text-stone-900 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              WhatsApp (Hinglish)
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="rounded-lg border border-stone-200 bg-[#FCFBF9] p-5">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-stone-800">
              {activeText}
            </pre>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    Copied to Clipboard
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy Correspondence
                  </>
                )}
              </button>

              {channel !== "formalEmail" ? (
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5 text-emerald-700" />
                  Open in WhatsApp
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleMailto}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition cursor-pointer"
                >
                  <Mail className="h-3.5 w-3.5 text-stone-700" />
                  Open in Mail Client
                </button>
              )}
            </div>

            <span className="text-xs text-stone-500">
              Drafted in non-adversarial commercial tone
            </span>
          </div>
        </div>
      </div>

      {scripts.leveragePoints && scripts.leveragePoints.length > 0 && (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-5">
          <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-amber-900">
            <Scale className="h-4 w-4 text-amber-800" />
            Statutory Authority & Market Precedents (Indian Contract Act, 1872)
          </div>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-stone-700">
            {scripts.leveragePoints.map((pt, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="font-mono font-bold text-amber-800">
                  §{idx + 1}.
                </span>
                <span>{pt}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
