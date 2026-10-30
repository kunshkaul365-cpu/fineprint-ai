import { NextRequest, NextResponse } from "next/server";
import { getStoredUsers, registerUserSignup } from "@/lib/serverStore";
import { supabase } from "@/lib/supabase";
import { sanitizeShortText } from "@/lib/sanitize";

export async function GET() {
  try {
    const users = await getStoredUsers();
    return NextResponse.json({ ok: true, users });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fullName = sanitizeShortText(body?.fullName || "", 80);
    const email = sanitizeShortText(body?.email || "", 120).toLowerCase();
    const persona = body?.persona || "Student / Job Seeker";
    const organization = sanitizeShortText(body?.organization || "", 100);
    const feedbackNote = sanitizeShortText(body?.feedbackNote || "", 400);
    const estimatedSavingsInr = Number(body?.estimatedSavingsInr) || 45000;

    if (!fullName || !email || !email.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid full name and email address." },
        { status: 400 }
      );
    }

    if (supabase) {
      try {
        await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: true,
            data: { full_name: fullName, persona },
          },
        });
      } catch {
        // Non-blocking if SMTP is rate-limited
      }
    }

    const user = await registerUserSignup({
      fullName,
      email,
      persona,
      organization,
      feedbackNote,
      estimatedSavingsInr,
    });

    const allUsers = await getStoredUsers();

    return NextResponse.json({
      ok: true,
      user,
      users: allUsers,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
