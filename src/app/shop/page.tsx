import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Category = {
  id: string;
  name: string;
  slug: string;
};

type ProductImage = {
  image_url: string;
  is_primary: boolean | null;
  sort_order: number | null;
};

type ProductCategory = {
  id: string;
  name: string;
  slug: string;
} | null;

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  sale_price: number | null;
  stock: number;
  status: string;
  featured: boolean;
  brand: string | null;
  category: ProductCategory;
  product_images: ProductImage[];
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function getPrimaryImage(images: ProductImage[]) {
  if (!images || images.length === 0) return null;

  const sorted = [...images].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;

    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });

  return sorted[0]?.image_url ?? null;
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    q?: string;
  }>;
}) {
  const supabase = await createClient();

  const params = await searchParams;
  const categorySlug =
    typeof params.category === "string" ? params.category.trim() : "";
  const search =
    typeof params.q === "string" ? params.q.trim() : "";

  const { data: categoriesData } = await supabase
    .from("categories")
    .select("id,name,slug")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  const categories = (categoriesData ?? []) as Category[];

  let selectedCategoryId: string | null = null;

  if (categorySlug) {
    selectedCategoryId =
      categories.find((category) => category.slug === categorySlug)?.id ?? null;
  }

  let productsQuery = supabase
    .from("products")
    .select(`
      id,
      name,
      slug,
      description,
      price,
      sale_price,
      stock,
      status,
      featured,
      brand,
      category:categories (
        id,
        name,
        slug
      ),
      product_images (
        image_url,
        is_primary,
        sort_order
      )
    `)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (selectedCategoryId) {
    productsQuery = productsQuery.eq("category_id", selectedCategoryId);
  }

  if (search) {
    productsQuery = productsQuery.ilike("name", `%${search}%`);
  }

  const { data: productsData, error } = await productsQuery;

  const products = (productsData ?? []) as unknown as Product[];

  const selectedCategory = categories.find(
    (category) => category.slug === categorySlug
  );

  const hasFilters = Boolean(search || categorySlug);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Announcement */}
      <div className="bg-[#061a3a] px-4 py-2.5 text-center text-sm font-medium text-white">
        
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#061a3a] text-lg font-black text-white shadow-sm">
              M
            </div>

            <div className="min-w-0">
              <div className="truncate text-base font-extrabold tracking-tight text-[#061a3a]">
                MUHAJ Multi Biz
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                SNACKS AND MORE
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex">
            <Link href="/" className="transition hover:text-[#061a3a]">
              Home
            </Link>
            <Link href="/shop" className="text-[#061a3a]">
              Shop
            </Link>
            <Link href="/#categories" className="transition hover:text-[#061a3a]">
              Categories
            </Link>
            <Link href="/#about" className="transition hover:text-[#061a3a]">
              About
            </Link>
            <Link href="/#contact" className="transition hover:text-[#061a3a]">
              Contact
            </Link>
          </nav>

          <Link
            href="/cart"
            className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-[#061a3a] transition hover:border-[#061a3a] hover:bg-slate-50"
          >
            Cart
          </Link>
        </div>
      </header>

      {/* Page heading */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-[#b78927]">
              MUHAJ COLLECTION
            </p>

            <h1 className="text-3xl font-black tracking-tight text-[#061a3a] sm:text-4xl">
              Shop Our Products
            </h1>

            <p className="mt-3 text-base leading-7 text-slate-600">
              Browse quality products from MUHAJ Multi Biz with nationwide
              delivery across Nigeria.
            </p>
          </div>
        </div>
      </section>

      {/* Main shop area */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
          {/* Sidebar */}
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-28">
            <div className="mb-4">
              <h2 className="text-base font-extrabold text-[#061a3a]">
                Categories
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Browse by category
              </p>
            </div>

            <div className="space-y-1.5">
              <Link
                href="/shop"
                className={`block rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  !categorySlug
                    ? "bg-[#061a3a] text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-[#061a3a]"
                }`}
              >
                All Products
              </Link>

              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/shop?category=${encodeURIComponent(category.slug)}`}
                  className={`block rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    categorySlug === category.slug
                      ? "bg-[#061a3a] text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-[#061a3a]"
                  }`}
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </aside>

          {/* Products */}
          <div className="min-w-0">
            {/* Search / filter bar */}
            <div className="mb-7 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <form
                action="/shop"
                method="GET"
                className="flex flex-col gap-3 sm:flex-row"
              >
                {categorySlug && (
                  <input
                    type="hidden"
                    name="category"
                    value={categorySlug}
                  />
                )}

                <input
                  type="text"
                  name="q"
                  defaultValue={search}
                  placeholder="Search products..."
                  className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#061a3a] focus:ring-2 focus:ring-[#061a3a]/10"
                />

                <button
                  type="submit"
                  className="rounded-xl bg-[#061a3a] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#0a2858]"
                >
                  Search
                </button>

                {hasFilters && (
                  <Link
                    href="/shop"
                    className="rounded-xl border border-slate-200 px-5 py-3 text-center text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    Clear
                  </Link>
                )}
              </form>
            </div>

            {/* Results heading */}
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  {selectedCategory
                    ? selectedCategory.name
                    : search
                      ? `Search results for "${search}"`
                      : "All Products"}
                </p>

                <h2 className="mt-1 text-2xl font-black tracking-tight text-[#061a3a]">
                  {products.length}{" "}
                  {products.length === 1 ? "Product" : "Products"}
                </h2>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                We could not load the products right now. Please refresh the
                page and try again.
              </div>
            )}

            {/* Empty state */}
            {!error && products.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-2xl font-black text-[#061a3a]">
                  M
                </div>

                <h2 className="mt-5 text-xl font-black text-[#061a3a]">
                  No products found
                </h2>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  {search
                    ? "Try a different product name or clear the search."
                    : "There are currently no active products in this category."}
                </p>

                <Link
                  href="/shop"
                  className="mt-6 inline-flex rounded-xl bg-[#061a3a] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0a2858]"
                >
                  Browse All Products
                </Link>
              </div>
            )}

            {/* Product grid */}
            {!error && products.length > 0 && (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {products.map((product) => {
                  const image = getPrimaryImage(product.product_images ?? []);
                  const hasSale =
                    product.sale_price !== null &&
                    product.sale_price < product.price;

                  return (
                    <article
                      key={product.id}
                      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                    >
                      <Link href={`/products/${product.slug}`}>
                        <div className="relative aspect-square overflow-hidden bg-slate-100">
                          {image ? (
                            <img
                              src={image}
                              alt={product.name}
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-slate-100">
                              <div className="text-5xl font-black text-slate-300">
                                M
                              </div>
                            </div>
                          )}

                          {product.featured && (
                            <span className="absolute left-3 top-3 rounded-full bg-[#b78927] px-3 py-1 text-xs font-extrabold text-white">
                              Featured
                            </span>
                          )}

                          {product.stock <= 0 && (
                            <span className="absolute right-3 top-3 rounded-full bg-slate-900 px-3 py-1 text-xs font-extrabold text-white">
                              Out of Stock
                            </span>
                          )}
                        </div>
                      </Link>

                      <div className="p-5">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-xs font-bold uppercase tracking-wide text-[#b78927]">
                            {product.category?.name ?? "MUHAJ"}
                          </span>

                          {product.stock > 0 && (
                            <span className="text-xs font-semibold text-slate-400">
                              In stock
                            </span>
                          )}
                        </div>

                        <Link href={`/products/${product.slug}`}>
                          <h3 className="line-clamp-2 text-lg font-extrabold text-[#061a3a] transition group-hover:text-[#b78927]">
                            {product.name}
                          </h3>
                        </Link>

                        <p className="mt-2 line-clamp-2 min-h-[40px] text-sm leading-5 text-slate-500">
                          {product.description ||
                            "Quality product from MUHAJ Multi Biz."}
                        </p>

                        <div className="mt-4 flex items-end justify-between gap-3">
                          <div>
                            {hasSale && (
                              <div className="text-xs font-semibold text-slate-400 line-through">
                                {formatPrice(product.price)}
                              </div>
                            )}

                            <div className="text-lg font-black text-[#061a3a]">
                              {formatPrice(
                                hasSale
                                  ? product.sale_price as number
                                  : product.price
                              )}
                            </div>
                          </div>

                          <Link
                            href={`/products/${product.slug}`}
                            className="rounded-xl bg-[#061a3a] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#0a2858]"
                          >
                            View Product
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Delivery strip */}
      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-[#061a3a] px-6 py-8 text-white sm:px-10">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#d5ad58]">
                  SHOP WITH CONFIDENCE
                </p>
                <h2 className="mt-2 text-2xl font-black">
                  Nationwide Delivery Across Nigeria
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">
                  Select your products and place your order with MUHAJ Multi
                  Biz. We are based in Bauchi and deliver nationwide.
                </p>
              </div>

              <Link
                href="/cart"
                className="shrink-0 rounded-xl bg-white px-5 py-3 text-center text-sm font-extrabold text-[#061a3a] transition hover:bg-slate-100"
              >
                View Cart
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-950 text-slate-300">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <div className="text-lg font-black text-white">
                MUHAJ Multi Biz
              </div>
              <div className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#d5ad58]">
                SNACKS AND MORE
              </div>
              <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
                Quality products, dependable service and nationwide delivery
                from Bauchi.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-white">Quick Links</h3>
              <div className="mt-3 space-y-2 text-sm">
                <Link href="/" className="block hover:text-white">
                  Home
                </Link>
                <Link href="/shop" className="block hover:text-white">
                  Shop
                </Link>
                <Link href="/cart" className="block hover:text-white">
                  Cart
                </Link>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-white">Contact</h3>
              <div className="mt-3 space-y-2 text-sm text-slate-400">
                <div>07033672170</div>
                <div>muhajmultybiz@gmail.com</div>
                <div>Federal Low-Cost, Bauchi</div>
                <div>Nationwide Delivery</div>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-white/10 pt-6 text-xs text-slate-500">
            Â© 2026 MUHAJ Multi Biz. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}