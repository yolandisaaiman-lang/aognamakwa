import { NextRequest, NextResponse } from "next/server";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(request: NextRequest) {
  try {
    if (!url || !key) {
      return NextResponse.json({ error: "Supabase has not been configured yet." }, { status: 503 });
    }

    let body: { email?: string; password?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const { email, password } = body || {};
    if (!email || !password) {
      return NextResponse.json({ error: "Please enter both email and password." }, { status: 400 });
    }

    const authResponse = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
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
        { error: auth.error_description || auth.msg || auth.error || "Invalid email or password." },
        { status: authResponse.status || 401 }
      );
    }

    let profile: any = null;
    if (auth.user?.id) {
      const metaRole = auth.user.user_metadata?.role;
      const metaName = auth.user.user_metadata?.full_name;
      const metaArea = auth.user.user_metadata?.area;

      const profileResponse = await fetch(`${url}/rest/v1/profiles?select=*&id=eq.${auth.user.id}`, {
        headers: { apikey: key, Authorization: `Bearer ${auth.access_token}` },
      });
      const profileText = await profileResponse.text();
      let profiles: any[] = [];
      try {
        profiles = profileText ? JSON.parse(profileText) : [];
      } catch {
        profiles = [];
      }

      if (Array.isArray(profiles) && profiles.length > 0) {
        profile = {
          ...profiles[0],
          role: profiles[0].role || metaRole,
          full_name: profiles[0].full_name || metaName,
          area: profiles[0].area || metaArea,
        };
      } else {
        profile = {
          id: auth.user.id,
          email: auth.user.email,
          role: metaRole,
          full_name: metaName,
          area: metaArea,
        };

        if (metaRole) {
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
            // Ignore if profile table doesn't exist or RLS restricts insert
          }
        }
      }
    }

    return NextResponse.json({ accessToken: auth.access_token, profile, user: auth.user });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "An unexpected error occurred." }, { status: 500 });
  }
}
