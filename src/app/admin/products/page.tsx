import Link from "next/link";
import Image from "next/image";
import {
  Archive,
  Edit3,
  Package,
  Plus,
} from "lucide-react";

import AdminShell from "@/components/admin/AdminShell";
import { archiveProduct, deleteProduct } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Products | MUHAJ Multi Biz",
};

export default async function AdminProductsPage() {
  const { profile } = await requireAdmin();
  const supabase = await createClient();

  const [
    { data: products, error: productError },
    { data: categories },
  ] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, name, slug, sku, price, sale_price, stock, status, featured, category_id, created_at",
      )
      .order("created_at", { ascending: false }),

    supabase
      .from("categories")
      .select("id, name")
      .order("sort_order"),
  ]);

  const productIds = products?.map((product) => product.id) ?? [];

  const { data: images } = productIds.length
    ? await supabase
        .from("product_images")
        .select("id, product_id, image_url, is_primary")
        .in("product_id", productIds)
        .order("sort_order")
    : { data: [] };

  const categoryMap = new Map(
    (categories ?? []).map((category) => [category.id, category.name]),
  );

  const imageMap = new Map<
    string,
    {
      image_url: string;
      is_primary: boolean;
    }[]
  >();

  for (const image of images ?? []) {
    const current = imageMap.get(image.product_id) ?? [];
    current.push(image);
    imageMap.set(image.product_id, current);
  }

  return (
    <AdminShell
      profile={profile}
      activeHref="/admin/products"
    >
      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
              Catalogue
            </p>

            <h1 className="mt-1 text-3xl font-black text-slate-900">
              Products
            </h1>
          </div>

          <Link
            href="/admin/products/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            <Plus size={18} />
            Add Product
          </Link>
        </div>

        {productError ? (
          <div className="mt-7 rounded-2xl bg-red-50 p-6 text-sm text-red-700">
            Unable to load products: {productError.message}
          </div>
        ) : !products?.length ? (
          <div className="mt-7 rounded-3xl bg-white p-12 text-center shadow-sm">
            <Package
              className="mx-auto text-slate-300"
              size={52}
            />

            <h2 className="mt-4 text-xl font-bold text-slate-900">
              No products yet
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Add your first MUHAJ product.
            </p>

            <Link
              href="/admin/products/new"
              className="mt-6 inline-flex rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950"
            >
              Add First Product
            </Link>
          </div>
        ) : (
          <div className="mt-7 overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Price</th>
                    <th className="px-6 py-4">Stock</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {products.map((product) => {
                    const productImages =
                      imageMap.get(product.id) ?? [];

                    const primaryImage =
                      productImages.find(
                        (image) => image.is_primary,
                      )?.image_url ??
                      productImages[0]?.image_url;

                    return (
                      <tr
                        key={product.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-slate-100">
                              {primaryImage ? (
                                primaryImage.startsWith("http") ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img
                                    src={primaryImage}
                                    alt={product.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <Image
                                    src={primaryImage}
                                    alt={product.name}
                                    fill
                                    className="object-cover"
                                    sizes="64px"
                                  />
                                )
                              ) : (
                                <div className="flex h-full items-center justify-center">
                                  <Package
                                    className="text-slate-300"
                                    size={24}
                                  />
                                </div>
                              )}
                            </div>

                            <div>
                              <p className="font-bold text-slate-900">
                                {product.name}
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                {product.sku || "No SKU"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-sm text-slate-600">
                          {categoryMap.get(product.category_id ?? "") ??
                            "Uncategorized"}
                        </td>

                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900">
                            ₦
                            {Number(product.price).toLocaleString(
                              "en-NG",
                            )}
                          </p>

                          {product.sale_price !== null && (
                            <p className="mt-1 text-xs text-amber-700">
                              Sale ₦
                              {Number(
                                product.sale_price,
                              ).toLocaleString("en-NG")}
                            </p>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={
                              product.stock <= 5
                                ? "font-bold text-red-600"
                                : "font-semibold text-slate-700"
                            }
                          >
                            {product.stock}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={
                              product.status === "active"
                                ? "rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700"
                                : product.status === "archived"
                                  ? "rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600"
                                  : "rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700"
                            }
                          >
                            {product.status}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/admin/products/${product.id}`}
                              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-amber-400 hover:text-amber-700"
                            >
                              <Edit3 size={15} />
                              Edit
                            </Link>

                            {product.status !== "archived" && (
                              <form
                                action={archiveProduct.bind(
                                  null,
                                  product.id,
                                )}
                              >
                                <button
                                  type="submit"
                                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-amber-400 hover:text-amber-700"
                                >
                                  <Archive size={15} />
                                  Archive
                                </button>
                              </form>
                            )}

                            <form
                              action={deleteProduct.bind(
                                null,
                                product.id,
                              )}
                            >
                              <button
                                type="submit"
                                className="rounded-lg border border-red-100 px-3 py-2 text-sm font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </AdminShell>
  );
}