"use client";

import React, { useState } from "react";
import {
  Users,
  CheckCircle2,
  UserPlus,
  Share2,
  Check,
  Quote,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { UserProfileSignup } from "@/types/fineprint";

interface CommunityUsersWallProps {
  users: UserProfileSignup[];
  onUserRegistered: (
    updatedUsers: UserProfileSignup[],
    currentUser: UserProfileSignup
  ) => void;
}

export default function CommunityUsersWall({
  users,
  onUserRegistered,
}: CommunityUsersWallProps) {
  const [authTab, setAuthTab] = useState<"register" | "magiclink">("register");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [persona, setPersona] = useState<UserProfileSignup["persona"]>(
    "Student / Job Seeker"
  );
  const [organization, setOrganization] = useState("");
  const [feedbackNote, setFeedbackNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [copiedInvite, setCopiedInvite] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return;
    setSubmitting(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          persona,
          organization,
          feedbackNote,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErrorMsg(data.error || "Could not save registration to database.");
      } else if (data.users) {
        onUserRegistered(data.users, data.user);
        setFullName("");
        setEmail("");
        setOrganization("");
        setFeedbackNote("");
        setSuccessMsg(
          `Thank you, ${data.user.fullName}. Your record has been saved to the Supabase database.`
        );
      }
    } catch {
      setErrorMsg("Network error while connecting to database.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMagicLinkAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    setSubmitting(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          fullName: fullName.trim() || email.split("@")[0],
          persona,
          mode: "magic-link",
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErrorMsg(data.error || "Failed to dispatch Supabase Magic Link.");
      } else {
        if (data.user) {
          const updatedList = [
            data.user,
            ...users.filter((u) => u.email !== data.user.email),
          ];
          onUserRegistered(updatedList, data.user);
        }
        setSuccessMsg(
          data.message ||
            "Supabase Magic Link sent to your email and session authenticated."
        );
      }
    } catch {
      setErrorMsg("Network error while connecting to Supabase Auth.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyInviteLink = async () => {
    const shareUrl =
      typeof window !== "undefined" ? window.location.origin : "";
    const msg = `Hi! I built FinePrint Counsel — it examines Job Offer Letters, Rent Agreements & Freelance Contracts using AI to flag hidden liabilities and drafts your counter-offer. Try it out here: ${shareUrl}`;
    await navigator.clipboard.writeText(msg);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2500);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-amber-800">
            Client Registry & Supabase Auth
          </span>
          <h2 className="mt-1 font-legal-serif text-2xl font-semibold text-stone-900">
            Registered Users ({users.length})
          </h2>
          <p className="mt-0.5 text-xs text-stone-600">
            Authenticate via Supabase Magic Link or register your profile in the
            live Supabase PostgreSQL database (`user_profiles` table).
          </p>
        </div>

        <button
          type="button"
          onClick={handleCopyInviteLink}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-stone-800 transition cursor-pointer shrink-0"
        >
          {copiedInvite ? (
            <>
              <Check className="h-4 w-4 text-emerald-400" />
              Invitation Link Copied
            </>
          ) : (
            <>
              <Share2 className="h-4 w-4" />
              Copy Shareable Link
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                {authTab === "register" ? (
                  <UserPlus className="h-4 w-4 text-amber-800" />
                ) : (
                  <Mail className="h-4 w-4 text-amber-800" />
                )}
                <div>
                  <h3 className="font-legal-serif text-base font-semibold text-stone-900">
                    {authTab === "register"
                      ? "Client Registration & Feedback"
                      : "Supabase Magic Link Sign-In"}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {authTab === "register"
                      ? "Save your profile and review to the live database"
                      : "Passwordless OTP / Magic Link authentication"}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1 rounded-lg border border-stone-200 bg-stone-100/80 p-1">
              <button
                type="button"
                onClick={() => {
                  setAuthTab("register");
                  setErrorMsg("");
                  setSuccessMsg("");
                }}
                className={`rounded-md py-1.5 text-xs font-medium transition cursor-pointer ${
                  authTab === "register"
                    ? "bg-white text-stone-900 shadow-2xs font-semibold"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Register Profile
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthTab("magiclink");
                  setErrorMsg("");
                  setSuccessMsg("");
                }}
                className={`rounded-md py-1.5 text-xs font-medium transition cursor-pointer ${
                  authTab === "magiclink"
                    ? "bg-white text-stone-900 shadow-2xs font-semibold"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Magic Link Auth
              </button>
            </div>

            {authTab === "register" ? (
              <form onSubmit={handleSignup} className="space-y-3">
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
                    className="w-full rounded-lg border border-stone-300 bg-stone-50/60 px-3 py-2 text-sm text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
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
                    placeholder="name@example.com"
                    className="w-full rounded-lg border border-stone-300 bg-stone-50/60 px-3 py-2 text-sm text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Capacity
                    </label>
                    <select
                      value={persona}
                      onChange={(e) =>
                        setPersona(
                          e.target.value as UserProfileSignup["persona"]
                        )
                      }
                      className="w-full rounded-lg border border-stone-300 bg-stone-50/60 px-3 py-2 text-xs text-stone-900"
                    >
                      <option value="Student / Job Seeker">
                        Student / Job Seeker
                      </option>
                      <option value="Tenant / Renter">Tenant / Renter</option>
                      <option value="Freelancer / Creator">
                        Freelancer / Creator
                      </option>
                      <option value="Working Professional">
                        Working Professional
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Institution / Company
                    </label>
                    <input
                      type="text"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      placeholder="Optional"
                      className="w-full rounded-lg border border-stone-300 bg-stone-50/60 px-3 py-2 text-xs text-stone-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Feedback Note
                  </label>
                  <textarea
                    rows={3}
                    value={feedbackNote}
                    onChange={(e) => setFeedbackNote(e.target.value)}
                    placeholder="Share your experience examining a contract..."
                    className="w-full rounded-lg border border-stone-300 bg-stone-50/60 p-3 text-xs text-stone-900"
                  />
                </div>

                {errorMsg && (
                  <p className="text-xs font-medium text-red-700">{errorMsg}</p>
                )}

                {successMsg && (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
                    <span>{successMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-stone-900 py-2.5 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50 transition cursor-pointer"
                >
                  {submitting ? "Saving to Database..." : "Register User"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleMagicLinkAuth} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full rounded-lg border border-stone-300 bg-stone-50/60 px-3 py-2 text-sm text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Work or Personal Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full rounded-lg border border-stone-300 bg-stone-50/60 px-3 py-2 text-sm text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="rounded-lg border border-stone-200 bg-[#FAF8F5] p-3 text-xs text-stone-600 flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-amber-800 shrink-0 mt-0.5" />
                  <span>
                    Sends a passwordless <strong>Supabase Magic Link</strong>{" "}
                    (`signInWithOtp`) to your email, unlocks saved audit history
                    in Case Docket, and increases your session limit from 3 to 10
                    audits.
                  </span>
                </div>

                {errorMsg && (
                  <p className="text-xs font-medium text-red-700">{errorMsg}</p>
                )}

                {successMsg && (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
                    <span>{successMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-stone-900 py-2.5 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50 transition cursor-pointer"
                >
                  {submitting
                    ? "Sending Magic Link..."
                    : "Send Supabase Magic Link"}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-stone-600">
              <Users className="h-4 w-4 text-stone-700" />
              Live Database Records ({users.length})
            </h3>
          </div>

          {users.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-300 bg-white/60 p-10 text-center space-y-2">
              <p className="font-legal-serif text-base font-medium text-stone-800">
                No Registered Clients Yet
              </p>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Once you submit the registration form on the left, real user
                profiles will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex flex-col justify-between rounded-xl border border-stone-200 bg-white p-4 shadow-2xs"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-legal-serif font-semibold text-stone-900 text-base">
                          {u.fullName}
                        </p>
                        {u.organization && (
                          <p className="text-[11px] text-stone-500">
                            {u.organization}
                          </p>
                        )}
                      </div>
                      <span className="rounded-md border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] font-medium text-stone-700">
                        {u.persona}
                      </span>
                    </div>

                    {u.feedbackNote && (
                      <p className="mt-3 flex items-start gap-1.5 text-xs text-stone-600 leading-relaxed italic">
                        <Quote className="h-3.5 w-3.5 shrink-0 text-amber-800/60 mt-0.5" />
                        <span>&ldquo;{u.feedbackNote}&rdquo;</span>
                      </p>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-2.5 font-mono text-[10px] text-stone-500">
                    <span className="text-emerald-800 font-semibold">
                      ● VERIFIED DB RECORD
                    </span>
                    <span>
                      {new Date(u.createdAt).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
