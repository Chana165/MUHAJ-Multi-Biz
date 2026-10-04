import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { notFound } from "next/navigation";

import AdminShell from "@/components/admin/AdminShell";
import EditProductForm from "@/components/admin/products/EditProductForm";
import { deleteProduct } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createClient } from "@/lib/supabase/server";

interface EditProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

export const metadata = {
  title: "Edit Product | MUHAJ Multi Biz",
};

export default async function EditProductPage({
  params,
}: EditProductPageProps) {
  const { profile } = await requireAdmin();
  const { id } = await params;

  const supabase = await createClient();

  const [
    { data: product },
    { data: categories },
    { data: images },
  ] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, name, category_id, sku, description, price, sale_price, stock, status, featured",
      )
      .eq("id", id)
      .maybeSingle(),

    supabase
      .from("categories")
      .select("id, name")
      .eq("is_active", true)
      .order("sort_order"),

    supabase
      .from("product_images")
      .select(
        "id, image_url, storage_path, alt_text, is_primary, sort_order",
      )
      .eq("product_id", id)
      .order("sort_order"),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <AdminShell
      profile={profile}
      activeHref="/admin/products"
    >
      <section className="mx-auto max-w-5xl px-5 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
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
              Edit Product
            </h1>
          </div>

          <form
            action={deleteProduct.bind(null, product.id)}
          >
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50"
            >
              <Trash2 size={16} />
              Delete Product
            </button>
          </form>
        </div>

        <div className="mt-7">
          <EditProductForm
            product={product}
            categories={categories ?? []}
            initialImages={images ?? []}
          />
        </div>
      </section>
    </AdminShell>
  );
}