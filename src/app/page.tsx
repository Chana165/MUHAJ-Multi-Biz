import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

type Category = {
  id: string;
  name: string;
  slug: string;
};

type ProductImage = {
  image_url: string | null;
  is_primary: boolean;
  sort_order: number;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number | null;
  sale_price: number | null;
  stock: number | null;
  featured: boolean;
  status: string | null;
  category:
    | {
        id: string;
        name: string;
        slug: string;
      }
    | {
        id: string;
        name: string;
        slug: string;
      }[]
    | null;
  product_images: ProductImage[];
};

function money(value: number | null) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function getCategoryName(
  category: Product["category"]
) {
  if (Array.isArray(category)) {
    return category[0]?.name ?? "Product";
  }

  return category?.name ?? "Product";
}

function getPrimaryImage(
  images: ProductImage[]
) {
  const sorted = [...images].sort((a, b) => {
    const aPrimary = a.is_primary ? 0 : 1;
    const bPrimary = b.is_primary ? 0 : 1;

    if (aPrimary !== bPrimary) {
      return aPrimary - bPrimary;
    }

    return (
      (a.sort_order ?? 0) -
      (b.sort_order ?? 0)
    );
  });

  return sorted[0]?.image_url ?? null;
}

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();

  const [
    { data: categories },
    { data: products },
    { data: settings },
    { data: banners },
  ] = await Promise.all([
    supabase
      .from("categories")
      .select("id,name,slug")
      .eq("is_active", true)
      .order("sort_order", {
        ascending: true,
      }),

    supabase
      .from("products")
      .select(`
        id,
        name,
        slug,
        description,
        price,
        sale_price,
        stock,
        featured,
        status,
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
      .eq("featured", true)
      .order("created_at", {
        ascending: false,
      })
      .limit(8),

    supabase
      .from("store_settings")
      .select("*")
      .order("updated_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle(),

    supabase
      .from("banners")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", {
        ascending: true,
      })
      .limit(1)
      .maybeSingle(),
  ]);

  const storeName =
    settings?.store_name ||
    "MUHAJ Multi Biz";

  const tagline =
    settings?.tagline ||
    "SNACKS AND MORE";

  const description =
    settings?.description ||
    "Quality products across fashion, bags, shoes, kitchen and home essentials, snacks and more.";

  const phone =
    settings?.phone ||
    "07033672170";

  const whatsapp =
    settings?.whatsapp ||
    "07033672170";

  const email =
    settings?.email ||
    "muhajmultybiz@gmail.com";

  const address =
    settings?.address ||
    "Federal Low-Cost, Bauchi";

  const city =
    settings?.city ||
    "Bauchi";

  const state =
    settings?.state ||
    "Bauchi";

  const logoUrl =
    settings?.logo_url || "";

  const activeCategories =
    ((categories ?? []) as Category[]).slice(
      0,
      8
    );

  const featuredProducts =
    (products ?? []) as Product[];

  const banner =
    banners as Record<string, unknown> | null;

  const bannerTitle =
    banner?.title
      ? String(banner.title)
      : "Everything You Need, All in One Place.";

  const bannerSubtitle =
    banner?.subtitle
      ? String(banner.subtitle)
      : "Discover quality products from MUHAJ Multi Biz with nationwide delivery.";

  const bannerImage =
    banner?.image_url
      ? String(banner.image_url)
      : "";

  return (
    <main className="min-h-screen bg-[#faf9f6] text-[#071a3a]">

      {/* ======================================================
          TOP ANNOUNCEMENT
      ====================================================== */}

      <div className="bg-[#071a3a] px-4 py-2 text-center text-xs font-semibold tracking-wide text-white">
        
      </div>

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-6 px-5 lg:px-8">

          <Link
            href="/"
            className="flex min-w-0 items-center gap-3"
          >
            {logoUrl ? (
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                <img src={logoUrl} alt={storeName} className="h-full w-full object-contain p-1" />
              </div>
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-[#d4af37] bg-[#071a3a] text-xl font-black text-[#d4af37]">
                M
              </div>
            )}

            <div className="min-w-0">
              <div className="truncate text-lg font-black tracking-[0.08em] text-[#071a3a]">
                {storeName}
              </div>

              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#b28b16]">
                {tagline}
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            <Link
              href="/"
              className="text-sm font-semibold text-[#071a3a] transition hover:text-[#b28b16]"
            >
              Home
            </Link>

            <Link
              href="/shop"
              className="text-sm font-semibold text-slate-600 transition hover:text-[#b28b16]"
            >
              Shop
            </Link>
                <Link
                  href="/track-order"
                  className="font-semibold text-[#071a3a] transition hover:text-[#b28b16]"
                >
                  Track Order
                </Link>

            <a
              href="#categories"
              className="text-sm font-semibold text-slate-600 transition hover:text-[#b28b16]"
            >
              Categories
            </a>

            <a
              href="#about"
              className="text-sm font-semibold text-slate-600 transition hover:text-[#b28b16]"
            >
              About
            </a>

            <a
              href="#contact"
              className="text-sm font-semibold text-slate-600 transition hover:text-[#b28b16]"
            >
              Contact
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/cart"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:px-4"
            >
              Cart
            </Link>

            <Link
              href="/shop"
              className="hidden h-10 items-center justify-center rounded-xl bg-[#071a3a] px-4 text-sm font-semibold text-white transition hover:bg-[#102b58] sm:inline-flex"
            >
              Shop Now
            </Link>
          </div>
        </div>

        <div className="border-t border-slate-100 md:hidden">
          <nav className="mx-auto flex max-w-7xl gap-5 overflow-x-auto px-5 py-3">
            <Link
              href="/"
              className="whitespace-nowrap text-xs font-semibold text-[#071a3a]"
            >
              Home
            </Link>

            <Link
              href="/shop"
              className="whitespace-nowrap text-xs font-semibold text-slate-600"
            >
              Shop
            </Link>
                <Link
                  href="/track-order"
                  className="font-semibold text-[#071a3a] transition hover:text-[#b28b16]"
                >
                  Track Order
                </Link>

            <a
              href="#categories"
              className="whitespace-nowrap text-xs font-semibold text-slate-600"
            >
              Categories
            </a>

            <a
              href="#about"
              className="whitespace-nowrap text-xs font-semibold text-slate-600"
            >
              About
            </a>

            <a
              href="#contact"
              className="whitespace-nowrap text-xs font-semibold text-slate-600"
            >
              Contact
            </a>
          </nav>
        </div>
      </header>

      {/* ======================================================
          HERO
      ====================================================== */}

      <section className="relative overflow-hidden bg-[#071a3a]">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -left-28 -top-28 h-80 w-80 rounded-full border-[36px] border-[#d4af37]" />
          <div className="absolute -bottom-44 -right-32 h-[460px] w-[460px] rounded-full border-[46px] border-[#d4af37]" />
        </div>

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 sm:py-20 md:grid-cols-[1.1fr_0.9fr] md:px-8 md:py-24 lg:py-28">

          <div>
            <span className="inline-flex rounded-full border border-[#d4af37]/40 bg-[#d4af37]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[#e8c95c]">
              {storeName}
            </span>

            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              {bannerTitle}
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-blue-100/80 sm:text-lg">
              {bannerSubtitle}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/shop"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-[#d4af37] px-7 text-sm font-bold text-[#071a3a] transition hover:bg-[#e8c95c]"
              >
                Shop Products
              </Link>

              <a
                href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-white/20 bg-white/5 px-7 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Order on WhatsApp
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-blue-100/60">
              <span>Nationwide Delivery</span>
              <span>Quality Products</span>
              <span>Customer Support</span>
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl">
              <div className="relative aspect-[4/3] w-full">
                {bannerImage ? (
                  <img src={bannerImage} alt={bannerTitle} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#102b58] to-[#071a3a]">
                    <div className="text-center">
                      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#d4af37] text-5xl font-black text-[#d4af37]">
                        M
                      </div>

                      <p className="mt-5 text-xs font-bold uppercase tracking-[0.3em] text-[#d4af37]">
                        Multi Biz
                      </p>

                      <p className="mt-2 text-sm text-white/60">
                        {tagline}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ======================================================
          CATEGORIES
      ====================================================== */}

      <section
        id="categories"
        className="mx-auto max-w-7xl px-5 py-16 sm:py-20 md:px-8"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#b28b16]">
              Explore
            </p>

            <h2 className="mt-2 text-3xl font-black tracking-tight text-[#071a3a] sm:text-4xl">
              Shop by Category
            </h2>
          </div>

          <Link
            href="/shop"
            className="text-sm font-bold text-[#071a3a] hover:text-[#b28b16]"
          >
            View All Products 
          </Link>
        </div>

        {activeCategories.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <p className="font-semibold text-slate-900">
              Categories will appear here soon.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {activeCategories.map((category) => (
              <Link
                key={category.id}
                href={`/shop?category=${encodeURIComponent(category.slug)}`}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#d4af37]/50 hover:shadow-lg sm:p-6"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#071a3a] text-lg font-black text-[#d4af37]">
                  {category.name.charAt(0)}
                </div>

                <h3 className="mt-5 font-bold text-[#071a3a]">
                  {category.name}
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Explore products
                </p>

                <span className="mt-5 block text-xs font-bold text-[#b28b16] transition group-hover:translate-x-1">
                  Shop Category 
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ======================================================
          FEATURED PRODUCTS
      ====================================================== */}

      <section
        id="featured"
        className="border-y border-slate-200 bg-white"
      >
        <div className="mx-auto max-w-7xl px-5 py-16 sm:py-20 md:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#b28b16]">
                Featured
              </p>

              <h2 className="mt-2 text-3xl font-black tracking-tight text-[#071a3a] sm:text-4xl">
                Selected for You
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                Discover some of the products currently featured by MUHAJ Multi Biz.
              </p>
            </div>

            <Link
              href="/shop"
              className="text-sm font-bold text-[#071a3a] hover:text-[#b28b16]"
            >
              Browse Shop 
            </Link>
          </div>

          {featuredProducts.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center">
              <p className="font-semibold text-slate-900">
                Featured products will appear here.
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Products selected as featured in the admin panel will automatically appear on the homepage.
              </p>

              <Link
                href="/shop"
                className="mt-5 inline-flex h-10 items-center rounded-xl bg-[#071a3a] px-4 text-sm font-semibold text-white"
              >
                Visit Shop
              </Link>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {featuredProducts.map((product) => {
                const image = getPrimaryImage(
                  product.product_images ?? []
                );

                const category =
                  getCategoryName(
                    product.category
                  );

                const sale =
                  product.sale_price !== null &&
                  product.sale_price <
                    (product.price ?? 0);

                return (
                  <article
                    key={product.id}
                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                  >
                    <Link
                      href={`/products/${product.slug}`}
                      className="relative block aspect-square overflow-hidden bg-slate-100"
                    >
                      {image ? (
                        <img src={image} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-[#071a3a]">
                          <span className="text-4xl font-black text-[#d4af37]">
                            M
                          </span>
                        </div>
                      )}

                      <span className="absolute left-3 top-3 rounded-full bg-[#d4af37] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#071a3a]">
                        Featured
                      </span>
                    </Link>

                    <div className="p-4 sm:p-5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#b28b16]">
                        {category}
                      </p>

                      <Link
                        href={`/products/${product.slug}`}
                      >
                        <h3 className="mt-1 line-clamp-2 font-bold text-[#071a3a] transition hover:text-[#b28b16]">
                          {product.name}
                        </h3>
                      </Link>

                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                        {product.description ||
                          "Quality product from MUHAJ Multi Biz."}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="font-bold text-[#071a3a]">
                          {money(
                            sale
                              ? product.sale_price
                              : product.price
                          )}
                        </span>

                        {sale ? (
                          <span className="text-xs text-slate-400 line-through">
                            {money(product.price)}
                          </span>
                        ) : null}
                      </div>

                      <Link
                        href={`/products/${product.slug}`}
                        className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl bg-[#071a3a] text-xs font-bold text-white transition hover:bg-[#102b58]"
                      >
                        View Product
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ======================================================
          DELIVERY
      ====================================================== */}

      <section className="bg-[#071a3a]">
        <div className="mx-auto max-w-7xl px-5 py-16 text-center sm:py-20 md:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#d4af37]">
            Shop With Confidence
          </p>

          <h2 className="mt-4 text-3xl font-black text-white sm:text-4xl">
            From Bauchi to Anywhere in Nigeria.
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-blue-100/70 sm:text-base">
            Browse our products, place your order and let MUHAJ Multi Biz
            bring your selected products closer to you.
          </p>

          <Link
            href="/shop"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-[#d4af37] px-7 text-sm font-bold text-[#071a3a] transition hover:bg-[#e8c95c]"
          >
            Start Shopping
          </Link>
        </div>
      </section>

      {/* ======================================================
          ABOUT
      ====================================================== */}

      <section
        id="about"
        className="mx-auto max-w-7xl px-5 py-16 sm:py-20 md:px-8"
      >
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div className="relative overflow-hidden rounded-[2rem] bg-[#071a3a]">
            <div className="flex aspect-[4/3] items-center justify-center">
              {logoUrl ? (
                <div className="relative h-40 w-40 overflow-hidden rounded-3xl bg-white p-4">
                  <img src={logoUrl} alt={storeName} className="object-contain p-4" />
                </div>
              ) : (
                <div className="text-center">
                  <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#d4af37] text-5xl font-black text-[#d4af37]">
                    M
                  </div>

                  <p className="mt-5 text-2xl font-black tracking-[0.15em] text-white">
                    MUHAJ
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#b28b16]">
              About MUHAJ
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#071a3a] sm:text-4xl">
              More Than Just a Store.
            </h2>

            <p className="mt-5 leading-7 text-slate-600">
              {description}
            </p>

            <p className="mt-4 leading-7 text-slate-600">
              We are based in {city}, {state}, Nigeria and provide
              nationwide delivery so customers can shop from wherever
              they are.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/shop"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[#071a3a] px-5 text-sm font-bold text-white hover:bg-[#102b58]"
              >
                Explore Products
              </Link>

              <a
                href={`tel:${phone}`}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          CONTACT
      ====================================================== */}

      <section
        id="contact"
        className="border-t border-slate-200 bg-white"
      >
        <div className="mx-auto max-w-7xl px-5 py-16 sm:py-20 md:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#b28b16]">
                Contact
              </p>

              <h2 className="mt-3 text-3xl font-black text-[#071a3a]">
                Get in Touch
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Have a question about a product or an order? Contact MUHAJ Multi Biz.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 md:col-span-2">
              <a
                href={`tel:${phone}`}
                className="rounded-2xl border border-slate-200 p-5 hover:bg-slate-50"
              >
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Phone
                </p>

                <p className="mt-2 font-semibold text-[#071a3a]">
                  {phone}
                </p>
              </a>

              <a
                href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-slate-200 p-5 hover:bg-slate-50"
              >
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  WhatsApp
                </p>

                <p className="mt-2 font-semibold text-[#071a3a]">
                  {whatsapp}
                </p>
              </a>

              <a
                href={`mailto:${email}`}
                className="rounded-2xl border border-slate-200 p-5 hover:bg-slate-50"
              >
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Email
                </p>

                <p className="mt-2 break-all font-semibold text-[#071a3a]">
                  {email}
                </p>
              </a>

              <div className="rounded-2xl border border-slate-200 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Location
                </p>

                <p className="mt-2 font-semibold text-[#071a3a]">
                  {address}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          FOOTER
      ====================================================== */}

      <footer className="bg-[#071a3a] text-white">
        <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
          <div className="grid gap-8 md:grid-cols-3">

            <div>
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <div className="relative h-11 w-11 overflow-hidden rounded-xl bg-white">
                    <img src={logoUrl} alt={storeName} className="h-full w-full object-contain p-1" />
                  </div>
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#d4af37] text-lg font-black text-[#d4af37]">
                    M
                  </div>
                )}

                <div>
                  <p className="font-black tracking-[0.12em]">
                    {storeName}
                  </p>

                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#d4af37]">
                    {tagline}
                  </p>
                </div>
              </div>

              <p className="mt-4 max-w-md text-sm leading-6 text-blue-100/60">
                {description}
              </p>
            </div>

            <div>
              <h3 className="font-bold text-[#d4af37]">
                Quick Links
              </h3>

              <div className="mt-4 flex flex-col gap-3 text-sm text-blue-100/60">
                <Link
                  href="/"
                  className="hover:text-white"
                >
                  Home
                </Link>

                <Link
                  href="/shop"
                  className="hover:text-white"
                >
                  Shop
                </Link>
                <Link
                  href="/track-order"
                  className="font-semibold text-[#071a3a] transition hover:text-[#b28b16]"
                >
                  Track Order
                </Link>

                <Link
                  href="/cart"
                  className="hover:text-white"
                >
                  Cart
                </Link>

                <a
                  href="#about"
                  className="hover:text-white"
                >
                  About
                </a>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-[#d4af37]">
                Contact
              </h3>

              <div className="mt-4 flex flex-col gap-3 text-sm text-blue-100/60">
                <a
                  href={`tel:${phone}`}
                  className="hover:text-white"
                >
                  {phone}
                </a>

                <a
                  href={`mailto:${email}`}
                  className="break-all hover:text-white"
                >
                  {email}
                </a>

                <span>
                  {city}, {state}, Nigeria
                </span>

                <span>
                  Nationwide Delivery
                </span>
              </div>
            </div>

          </div>

          <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-blue-100/40">
  <div>
    © {new Date().getFullYear()} {storeName}. All rights reserved.
  </div>
  <div className="mt-2">
    Developed by <span className="text-blue-100/60">ChanaByte Technologies</span>
  </div>
</div>
        </div>
      </footer>

    </main>
  );
}
