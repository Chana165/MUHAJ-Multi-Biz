import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createClient();

  const { data: claimsData } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (!userId) {
    redirect("/admin/login");
  }

  const { data: profile } =
    await supabase
      .from("profiles")
      .select(
        "id, full_name, role, is_active, must_change_password"
      )
      .eq("id", userId)
      .maybeSingle();

  if (
    !profile ||
    (profile.role !== "admin" &&
      profile.role !== "super_admin")
  ) {
    redirect("/admin/login");
  }

  if (profile.is_active === false) {
    redirect("/admin/login");
  }

  if (profile.must_change_password === true) {
    redirect("/admin/change-password");
  }

  return {
    userId,
    profile,
  };
}