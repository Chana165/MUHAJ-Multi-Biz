import { redirect } from "next/navigation";
import AdminFirstPasswordForm from "./AdminFirstPasswordForm";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Set New Password | MUHAJ Multi Biz",
  description:
    "Set a new administrator password.",
};

export default async function AdminChangePasswordPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
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
    redirect("/admin/login");
  }

  if (profile.is_active === false) {
    await supabase.auth.signOut();
    redirect("/admin/login");
  }

  if (!profile.must_change_password) {
    redirect("/admin");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400 text-2xl font-black text-slate-950">
            M
          </div>

          <h1 className="text-3xl font-bold text-white">
            MUHAJ Multi Biz
          </h1>
        </div>

        <div className="rounded-3xl bg-white p-7 shadow-2xl sm:p-8">
          <h2 className="text-center text-2xl font-bold text-slate-900">
            Set Your New Password
          </h2>

          <div className="mt-7">
            <AdminFirstPasswordForm />
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          MUHAJ Multi Biz · Snacks and More
        </p>
      </div>
    </main>
  );
}