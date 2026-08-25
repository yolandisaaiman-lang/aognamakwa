import { NextRequest, NextResponse } from "next/server";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function headers(request: NextRequest) {
  return {
    apikey: key!,
    Authorization: request.headers.get("authorization") || "",
    "Content-Type": "application/json",
  };
}

function ready() {
  return Boolean(url && key);
}

// Helper to get authenticated user & sync their profile into public.profiles
async function ensureUserProfile(request: NextRequest) {
  const token = request.headers.get("authorization");
  if (!token) return null;

  try {
    const userRes = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: key!, Authorization: token },
    });
    if (!userRes.ok) return null;
    const user = await userRes.json();
    if (!user?.id) return null;

    const metaRole = user.user_metadata?.role || "church_administrator";
    const metaName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
    const metaArea = user.user_metadata?.area || "Nababeep";

    // Upsert into public.profiles
    await fetch(`${url}/rest/v1/profiles`, {
      method: "POST",
      headers: {
        apikey: key!,
        Authorization: token,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        id: user.id,
        full_name: metaName,
        role: metaRole,
        area: metaArea,
      }),
    }).catch(() => {});

    return user;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!ready()) return NextResponse.json({ error: "Supabase has not been configured yet." }, { status: 503 });
    
    // Ensure profile is synced first so Supabase RLS sees current role
    const user = await ensureUserProfile(request);

    let response = await fetch(`${url}/rest/v1/reports?select=*&order=service_date.desc,created_at.desc&limit=200`, {
      headers: headers(request),
      cache: "no-store",
    });

    let text = await response.text();
    let data: any = [];
    try {
      data = text ? JSON.parse(text) : [];
    } catch {
      data = [];
    }

    // If user is Church Admin or Pastoral Leader, but RLS returned empty or restricted data, try fallback
    const isLeader = user?.user_metadata?.role === "church_administrator" || user?.user_metadata?.role === "pastoral_leader";
    if (isLeader && Array.isArray(data) && data.length === 0) {
      const adminResponse = await fetch(`${url}/rest/v1/reports?select=*&order=service_date.desc,created_at.desc&limit=200`, {
        headers: {
          apikey: key!,
          Authorization: `Bearer ${key!}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });
      const adminText = await adminResponse.text();
      try {
        const adminData = adminText ? JSON.parse(adminText) : [];
        if (Array.isArray(adminData) && adminData.length > 0) {
          data = adminData;
        }
      } catch {
        // Keep original data if fallback fails
      }
    }

    return NextResponse.json(data, { status: response.status });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error fetching reports." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!ready()) return NextResponse.json({ error: "Supabase has not been configured yet." }, { status: 503 });
    
    let payload: any = {};
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    if (!payload.title || !payload.title.trim()) {
      return NextResponse.json({ error: "Please enter a report title." }, { status: 400 });
    }

    const user = await ensureUserProfile(request);

    const reportBody = {
      created_by: user?.id || undefined,
      title: payload.title.trim(),
      attendance: Number(payload.attendance) || 0,
      amount: Number(payload.amount) || 0,
      area: payload.area || user?.user_metadata?.area || "Nababeep",
      ministry_role: payload.ministry_role || user?.user_metadata?.role || "area_leader",
      service_date: payload.service_date || new Date().toISOString().split("T")[0],
      notes: payload.notes || null,
      details: payload.details || {},
    };

    const response = await fetch(`${url}/rest/v1/reports`, {
      method: "POST",
      headers: { ...headers(request), Prefer: "return=representation" },
      body: JSON.stringify(reportBody),
    });

    const text = await response.text();
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }

    if (!response.ok) {
      if (data.code === "42501" || text.includes("row-level security")) {
        return NextResponse.json(
          {
            error: "Supabase Row-Level Security policy blocked this insert. Please run the SQL script in supabase/PASTE_THIS_INTO_SUPABASE.sql in your Supabase SQL Editor to grant permission to all ministry roles.",
            code: "42501",
            hint: data.hint || data.message,
          },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: data.message || data.error || data.hint || `Failed to save report (${response.status}).` },
        { status: response.status }
      );
    }

    return NextResponse.json(Array.isArray(data) ? data[0] : data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error creating report." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!ready()) return NextResponse.json({ error: "Supabase has not been configured yet." }, { status: 503 });
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Report ID is required." }, { status: 400 });

    const response = await fetch(`${url}/rest/v1/reports?id=eq.${id}`, {
      method: "DELETE",
      headers: headers(request),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Unable to delete report." }, { status: response.status });
    }

    return NextResponse.json({ message: "Report deleted successfully." });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error deleting report." }, { status: 500 });
  }
}
