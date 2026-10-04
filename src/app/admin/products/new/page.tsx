import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import AdminShell from "@/components/admin/AdminShell";
import AddProductForm from "@/components/admin/products/AddProductForm";
import { requireAdmin } from "@/lib/supabase/require-admin";

export const metadata = {
  title: "Add Product | MUHAJ Multi Biz",
};

export default async function AddProductPage() {
  const { profile } = await requireAdmin();

  return (
    <AdminShell
      profile={profile}
      activeHref="/admin/products"
    >
      <section className="mx-auto max-w-5xl px-5 py-8 sm:px-6">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to Products
        </Link>

        <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-amber-700">
          Product Management
        </p>

        <h1 className="mt-1 text-3xl font-black text-slate-900">
          Add Product
        </h1>

        <div className="mt-7">
          <AddProductForm />
        </div>
      </section>
    </AdminShell>
  );
}