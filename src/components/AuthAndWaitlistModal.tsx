"use client";

import React, { useState } from "react";
import {
  Scale,
  Mail,
  CheckCircle2,
  X,
  Lock,
  Sparkles,
  LogOut,
} from "lucide-react";

export interface AuthenticatedSessionUser {
  id: string;
  email: string;
  fullName: string;
  authenticatedAt: string;
  plan: string;
}

interface AuthAndWaitlistModalProps {
  isOpen: boolean;
  mode: "auth" | "waitlist";
  onClose: () => void;
  sessionUser: AuthenticatedSessionUser | null;
  onAuthenticated: (user: AuthenticatedSessionUser) => void;
  onSignOut: () => void;
  auditsUsed: number;
  maxFreeAudits: number;
}

export default function AuthAndWaitlistModal({
  isOpen,
  mode: initialMode,
  onClose,
  sessionUser,
  onAuthenticated,
  onSignOut,
  auditsUsed,
  maxFreeAudits,
}: AuthAndWaitlistModalProps) {
  const [activeTab, setActiveTab] = useState<"auth" | "waitlist">(initialMode);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const handleMagicLinkSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, fullName }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErrorMessage(data.error || "Authentication failed.");
      } else {
        setStatusMessage(data.message);
        if (data.sessionUser) {
          onAuthenticated(data.sessionUser);
        }
      }
    } catch {
      setErrorMessage("Network error while connecting to Supabase Auth.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinProWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !fullName.trim()) return;
    setLoading(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          persona: "Working Professional",
          organization: organization || "Pro Counsel Waitlist",
          feedbackNote: "Joined Pro Counsel Unlimited Tier Waitlist",
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErrorMessage(data.error || "Could not join waitlist.");
      } else {
        const upgradedUser: AuthenticatedSessionUser = {
          id: data.user?.id || crypto.randomUUID(),
          email: email.trim().toLowerCase(),
          fullName: fullName.trim(),
          authenticatedAt: new Date().toISOString(),
          plan: "Pro Waitlist Member (10 Audits / Session)",
        };
        onAuthenticated(upgradedUser);
        setStatusMessage(
          "You have been added to the Pro Counsel Waitlist in Supabase and unlocked 10 audits for this session!"
        );
      }
    } catch {
      setErrorMessage("Network error while joining waitlist.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-stone-200 bg-[#FBF9F5] shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 bg-white px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900 text-amber-200">
              <Scale className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-legal-serif text-base font-bold text-stone-900">
                FinePrint Counsel Access
              </h3>
              <p className="font-mono text-[10px] uppercase tracking-wider text-stone-500">
                Supabase Magic Link Auth & Pro Tier
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-900 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex rounded-lg border border-stone-200 bg-stone-100 p-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab("auth");
                setStatusMessage("");
                setErrorMessage("");
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition cursor-pointer ${
                activeTab === "auth"
                  ? "bg-white text-stone-900 shadow-2xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Lock className="h-3.5 w-3.5" />
              Supabase Magic Link
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("waitlist");
                setStatusMessage("");
                setErrorMessage("");
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition cursor-pointer ${
                activeTab === "waitlist"
                  ? "bg-white text-stone-900 shadow-2xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-700" />
              Pro Tier & Waitlist
            </button>
          </div>

          {sessionUser ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                Active Authenticated Session
              </div>
              <div className="text-xs text-stone-700 space-y-1">
                <p>
                  <strong>Name:</strong> {sessionUser.fullName}
                </p>
                <p>
                  <strong>Email:</strong> {sessionUser.email}
                </p>
                <p>
                  <strong>Active Plan:</strong> {sessionUser.plan}
                </p>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          ) : activeTab === "auth" ? (
            <form onSubmit={handleMagicLinkSignIn} className="space-y-3.5">
              <p className="text-xs text-stone-600 leading-relaxed">
                Sign in with your email via <strong>Supabase Auth</strong> to
                save your personal contract audit history and unlock{" "}
                <strong>10 audits per session</strong> (Guest Free Tier:{" "}
                {auditsUsed}/{maxFreeAudits} used).
              </p>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Work or College Email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-stone-900 py-2.5 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50 cursor-pointer"
              >
                <Mail className="h-3.5 w-3.5 text-amber-200" />
                {loading
                  ? "Sending Supabase Magic Link..."
                  : "Send Magic Link & Activate Session"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoinProWaitlist} className="space-y-3.5">
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 space-y-1">
                <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-900">
                  Free Tier Limit: {auditsUsed} / {maxFreeAudits} Audits Used
                </p>
                <p className="text-xs text-stone-700 leading-relaxed">
                  Upgrade to <strong>FinePrint Counsel Pro (₹199/mo)</strong>{" "}
                  for unlimited contract examinations, bulk HR/lease batch
                  audits, and priority redline templates. Join the waitlist
                  below to unlock <strong>10 bonus audits immediately</strong>:
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Company / Institution
                </label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-stone-900 py-2.5 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-200" />
                {loading
                  ? "Joining Pro Waitlist..."
                  : "Join Pro Waitlist & Unlock 10 Bonus Audits"}
              </button>
            </form>
          )}

          {errorMessage && (
            <p className="text-xs font-medium text-red-700">{errorMessage}</p>
          )}

          {statusMessage && (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700 mt-0.5" />
              <span>{statusMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
