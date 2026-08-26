import { NextRequest, NextResponse } from "next/server";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const validRoles = new Set([
  "church_administrator",
  "pastoral_leader",
  "area_leader",
  "youth",
  "transport",
  "usher_leader",
  "media_sound",
  "hospital_ministry",
]);

const validAreas = new Set(["Nababeep", "Concordia", "Okiep", "Springbok", "Aggeneys"]);

export async function POST(request: NextRequest) {
  try {
    if (!url || !key) {
      return NextResponse.json({ error: "Supabase has not been configured yet." }, { status: 503 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const { email, password, fullName, role, area } = body || {};
    if (!email || !password || !fullName || !role) {
      return NextResponse.json({ error: "Please complete your name, email, password and role." }, { status: 400 });
    }
    if (!validRoles.has(role)) {
      return NextResponse.json({ error: "Please choose a valid ministry role." }, { status: 400 });
    }
    if (area && !validAreas.has(area)) {
      return NextResponse.json({ error: "Please choose a valid area." }, { status: 400 });
    }

    const authResponse = await fetch(`${url}/auth/v1/signup`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        data: {
          full_name: fullName,
          role,
          area: area || null,
        },
      }),
    });

    const authText = await authResponse.text();
    let auth: any = {};
    try {
      auth = authText ? JSON.parse(authText) : {};
    } catch {
      auth = {};
    }

    if (!authResponse.ok) {
      return NextResponse.json(
        { error: auth.msg || auth.error_description || auth.error || "Unable to create account." },
        { status: authResponse.status || 400 }
      );
    }

    const profile = {
      id: auth.user?.id,
      email,
      role,
      full_name: fullName,
      area: area || null,
    };

    if (auth.access_token && auth.user?.id) {
      try {
        await fetch(`${url}/rest/v1/profiles`, {
          method: "POST",
          headers: {
            apikey: key,
            Authorization: `Bearer ${auth.access_token}`,
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates",
          },
          body: JSON.stringify(profile),
        });
      } catch {
        // Ignore if profiles table is missing or RLS restricted
      }
    }

    if (!auth.access_token) {
      return NextResponse.json({
        message: "Account created. Please confirm your email, then sign in.",
        user: auth.user,
        profile,
      });
    }

    return NextResponse.json({
      accessToken: auth.access_token,
      user: auth.user,
      profile,
      message: "Account created.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "An unexpected error occurred." }, { status: 500 });
  }
}
