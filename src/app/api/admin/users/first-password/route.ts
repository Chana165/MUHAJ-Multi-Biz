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

export async function POST(request: Request) {
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
      .select(
        "id, role, is_active, must_change_password"
      )
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
      await supabase.auth.signOut();

      return NextResponse.json(
        {
          success: false,
          error:
            "This administrator account is currently disabled.",
        },
        { status: 403 }
      );
    }

    if (!profile.must_change_password) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A mandatory password change is not pending for this account.",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    const password =
      typeof body?.password === "string"
        ? body.password
        : "";

    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Your new password must contain at least 8 characters.",
        },
        { status: 400 }
      );
    }

    const {
      error: passwordError,
    } = await supabase.auth.updateUser({
      password,
    });

    if (passwordError) {
      return NextResponse.json(
        {
          success: false,
          error: passwordError.message,
        },
        { status: 400 }
      );
    }

    const admin = getServiceClient();

    const { error: profileUpdateError } =
      await admin
        .from("profiles")
        .update({
          must_change_password: false,
          last_login_at: new Date().toISOString(),
        })
        .eq("id", user.id);

    if (profileUpdateError) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Your password was changed, but your administrator profile could not be finalized. Please contact a Super Admin.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Your password has been changed successfully.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to change your password.",
      },
      { status: 500 }
    );
  }
}