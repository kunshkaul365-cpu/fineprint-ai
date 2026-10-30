import { NextRequest, NextResponse } from "next/server";
import { getStoredUsers, registerUserSignup } from "@/lib/serverStore";

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
    const {
      fullName,
      email,
      persona = "Student / Job Seeker",
      organization = "",
      feedbackNote = "",
      estimatedSavingsInr = 45000,
    } = body;

    if (!fullName || !email || !email.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid full name and email address." },
        { status: 400 }
      );
    }

    const user = await registerUserSignup({
      fullName,
      email,
      persona,
      organization,
      feedbackNote,
      estimatedSavingsInr: Number(estimatedSavingsInr) || 45000,
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
