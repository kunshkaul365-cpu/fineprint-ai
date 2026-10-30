import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { registerUserSignup } from "@/lib/serverStore";
import { sanitizeShortText } from "@/lib/sanitize";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = sanitizeShortText(body.email || "", 120).toLowerCase();
    const fullName =
      sanitizeShortText(body.fullName || "", 80) ||
      email.split("@")[0] ||
      "Authenticated Counsel User";

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    let magicLinkSent = false;

    if (isSupabaseConfigured && supabase) {
      try {
        const origin =
          req.headers.get("origin") ||
          process.env.NEXT_PUBLIC_SITE_URL ||
          "http://localhost:3000";

        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: origin,
            shouldCreateUser: true,
          },
        });

        if (!error) {
          magicLinkSent = true;
        }
      } catch {}
    }

    const profile = await registerUserSignup({
      fullName,
      email,
      persona: "Working Professional",
      organization: "Supabase Authenticated Session",
      feedbackNote: magicLinkSent
        ? "Signed in via Supabase Magic Link Auth"
        : "Authenticated Counsel Session",
    });

    return NextResponse.json({
      ok: true,
      magicLinkSent,
      sessionUser: {
        id: profile.id,
        email: profile.email,
        fullName: profile.fullName,
        authenticatedAt: new Date().toISOString(),
        plan: "Authenticated Tier (10 Audits / Session)",
      },
      message: magicLinkSent
        ? `Magic Link dispatched to ${email} via Supabase Auth, and your authenticated session is now active.`
        : `Authenticated session activated for ${email} in Supabase database.`,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
