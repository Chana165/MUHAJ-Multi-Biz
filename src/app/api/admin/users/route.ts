import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
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

async function getCurrentUserContext() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      authenticated: false,
      userId: null,
      isSuperAdmin: false,
      profile: null,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  const isActive =
    profile?.is_active !== false;

  return {
    authenticated: true,
    userId: user.id,
    isSuperAdmin:
      profile?.role === "super_admin" &&
      isActive,
    profile,
  };
}

function generateTemporaryPassword() {
  return `MUHAJ-${randomBytes(12)
    .toString("base64url")
    .slice(0, 18)}!`;
}

export async function GET() {
  try {
    const context = await getCurrentUserContext();

    if (!context.authenticated) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required.",
        },
        { status: 401 }
      );
    }

    if (!context.isSuperAdmin) {
      return NextResponse.json(
        {
          success: false,
          isSuperAdmin: false,
          users: [],
        },
        { status: 403 }
      );
    }

    const admin = getServiceClient();

    const { data: profiles, error: profilesError } =
      await admin
        .from("profiles")
        .select(
          "id, full_name, admin_display_name, role, is_active, must_change_password, last_login_at, created_by"
        )
        .in("role", ["admin", "super_admin"]);

    if (profilesError) {
      return NextResponse.json(
        {
          success: false,
          error: profilesError.message,
        },
        { status: 500 }
      );
    }

    const { data: authData, error: authError } =
      await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

    if (authError) {
      return NextResponse.json(
        {
          success: false,
          error: authError.message,
        },
        { status: 500 }
      );
    }

    const emailById = new Map<string, string>();

    for (const user of authData.users) {
      if (user.email) {
        emailById.set(user.id, user.email);
      }
    }

    const users = (profiles ?? [])
      .map((profile) => ({
        id: profile.id,
        full_name: profile.full_name,
        admin_display_name:
          profile.admin_display_name,
        role: profile.role,
        email:
          emailById.get(profile.id) ?? "",
        is_active:
          profile.is_active !== false,
        must_change_password:
          profile.must_change_password === true,
        last_login_at:
          profile.last_login_at,
        created_by:
          profile.created_by,
      }))
      .sort((a, b) => {
        if (
          a.role === "super_admin" &&
          b.role !== "super_admin"
        ) {
          return -1;
        }

        if (
          a.role !== "super_admin" &&
          b.role === "super_admin"
        ) {
          return 1;
        }

        return (
          (a.admin_display_name ||
            a.full_name ||
            a.email ||
            "").localeCompare(
            b.admin_display_name ||
              b.full_name ||
              b.email ||
              ""
          )
        );
      });

    return NextResponse.json(
      {
        success: true,
        isSuperAdmin: true,
        users,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load administrator accounts.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const context = await getCurrentUserContext();

    if (!context.authenticated) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required.",
        },
        { status: 401 }
      );
    }

    if (!context.isSuperAdmin) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Only a Super Admin can create administrator accounts.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const displayName =
      typeof body?.displayName === "string"
        ? body.displayName.trim()
        : "";

    const email =
      typeof body?.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    if (displayName.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: "Enter a valid administrator name.",
        },
        { status: 400 }
      );
    }

    if (
      !email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Enter a valid administrator email address.",
        },
        { status: 400 }
      );
    }

    const admin = getServiceClient();
    const temporaryPassword =
      generateTemporaryPassword();

    const {
      data: authData,
      error: createUserError,
    } = await admin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: displayName,
        admin_display_name: displayName,
      },
    });

    if (createUserError || !authData.user) {
      return NextResponse.json(
        {
          success: false,
          error:
            createUserError?.message ??
            "Unable to create the administrator account.",
        },
        { status: 400 }
      );
    }

    const newUserId = authData.user.id;

    const { error: profileError } =
      await admin
        .from("profiles")
        .upsert(
          {
            id: newUserId,
            full_name: displayName,
            admin_display_name: displayName,
            role: "admin",
            is_active: true,
            must_change_password: true,
            created_by: context.userId,
          },
          {
            onConflict: "id",
          }
        );

    if (profileError) {
      try {
        await admin.auth.admin.deleteUser(
          newUserId
        );
      } catch {
        // Best-effort cleanup if profile creation fails.
      }

      return NextResponse.json(
        {
          success: false,
          error:
            profileError.message ||
            "Administrator profile could not be created.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUserId,
        email,
        admin_display_name: displayName,
        role: "admin",
        is_active: true,
        must_change_password: true,
      },
      temporaryPassword,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create administrator.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await getCurrentUserContext();

    if (!context.authenticated) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required.",
        },
        { status: 401 }
      );
    }

    if (!context.isSuperAdmin) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Only a Super Admin can change administrator status.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const userId =
      typeof body?.userId === "string"
        ? body.userId.trim()
        : "";

    const isActive =
      typeof body?.isActive === "boolean"
        ? body.isActive
        : null;

    if (!userId || isActive === null) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Administrator ID and status are required.",
        },
        { status: 400 }
      );
    }

    if (userId === context.userId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You cannot deactivate your own administrator account.",
        },
        { status: 400 }
      );
    }

    const admin = getServiceClient();

    const {
      data: target,
      error: targetError,
    } = await admin
      .from("profiles")
      .select("id, role, is_active")
      .eq("id", userId)
      .maybeSingle();

    if (targetError) {
      return NextResponse.json(
        {
          success: false,
          error: targetError.message,
        },
        { status: 500 }
      );
    }

    if (!target) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Administrator account was not found.",
        },
        { status: 404 }
      );
    }

    if (target.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Super Admin accounts are protected and cannot be deactivated here.",
        },
        { status: 400 }
      );
    }

    const { error: updateError } =
      await admin
        .from("profiles")
        .update({
          is_active: isActive,
        })
        .eq("id", userId)
        .eq("role", "admin");

    if (updateError) {
      return NextResponse.json(
        {
          success: false,
          error: updateError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      isActive,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to update administrator status.",
      },
      { status: 500 }
    );
  }
}