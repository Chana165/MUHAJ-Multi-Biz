import { NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

function getServiceClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL;

  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "Server Supabase configuration is missing."
    );
  }

  return createSupabaseAdminClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required.",
        },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (
      !profile ||
      (profile.role !== "admin" &&
        profile.role !== "super_admin")
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This account does not have administrator access.",
        },
        { status: 403 }
      );
    }

    if (profile.is_active === false) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This administrator account is disabled.",
        },
        { status: 403 }
      );
    }

    const admin = getServiceClient();

    const { error } = await admin
      .from("profiles")
      .update({
        last_login_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to record administrator login.",
      },
      { status: 500 }
    );
  }
}