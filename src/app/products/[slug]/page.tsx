import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AddToCartButton from "@/components/store/AddToCartButton";

type Category = {
  id: string;
  name: string;
  slug: string;
};

type ProductImage = {
  id?: string;
  image_url: string;
  is_primary: boolean | null;
  sort_order: number | null;
  alt_text?: string | null;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  description: string | null;
  price: number;
  sale_price: number | null;
  stock: number;
  status: string;
  featured: boolean;
  brand: string | null;
  weight: number | null;
  category: Category | null;
  product_images: ProductImage[];
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function sortImages(images: ProductImage[]) {
  return [...(images ?? [])].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;

    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
}

function getProductImage(images: ProductImage[]) {
  const sorted = sortImages(images);

  return sorted[0]?.image_url ?? null;
}

function getWhatsAppUrl(name: string, slug: string) {
  const message = encodeURIComponent(
    `Hello MUHAJ Multi Biz, I am interested in "${name}". Product link: http://localhost:3000/products/${slug}`
  );

  return `https://wa.me/07033672170?text=${message}`;
}

export default async function ProductDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const supabase = await createClient();

  const { slug } = await params;

  const { data: productData } = await supabase
    .from("products")
    .select(`
      id,
      name,
      slug,
      sku,
      description,
      price,
      sale_price,
      stock,
      status,
      featured,
      brand,
      weight,
      category:categories (
        id,
        name,
        slug
      ),
      product_images (
        id,
        image_url,
        is_primary,
        sort_order,
        alt_text
      )
    `)
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (!productData) {
    notFound();
  }

  const product = productData as unknown as Product;
  const images = sortImages(product.product_images ?? []);
  const primaryImage = getProductImage(images);

  const hasSale =
    product.sale_price !== null && product.sale_price < product.price;

  const displayPrice = hasSale
    ? (product.sale_price as number)
    : product.price;

  const discountPercent = hasSale
    ? Math.round(
        ((product.price - (product.sale_price as number)) /
          product.price) *
          100
      )
    : 0;

  let relatedProducts: Array<{
    id: string;
    name: string;
    slug: string;
    price: number;
    sale_price: number | null;
    product_images: ProductImage[];
  }> = [];

  if (product.category?.id) {
    const { data: relatedData } = await supabase
      .from("products")
      .select(`
        id,
        name,
        slug,
        price,
        sale_price,
        product_images (
          image_url,
          is_primary,
          sort_order
        )
      `)
      .eq("status", "active")
      .eq("category_id", product.category.id)
      .neq("id", product.id)
      .order("created_at", { ascending: false })
      .limit(4);

    relatedProducts = (relatedData ?? []) as typeof relatedProducts;
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Announcement */}
      <div className="bg-[#061a3a] px-4 py-2.5 text-center text-sm font-medium text-white">
        Nationwide Delivery Available â€¢ Shop MUHAJ Multi Biz
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

            <Link href="/shop" className="transition hover:text-[#061a3a]">
              Shop
            </Link>

            <Link
              href="/#categories"
              className="transition hover:text-[#061a3a]"
            >
              Categories
            </Link>

            <Link href="/#about" className="transition hover:text-[#061a3a]">
              About
            </Link>

            <Link
              href="/#contact"
              className="transition hover:text-[#061a3a]"
            >
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

      {/* Breadcrumb */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 text-sm sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-2 text-slate-500">
            <Link href="/" className="hover:text-[#061a3a]">
              Home
            </Link>

            <span>/</span>

            <Link href="/shop" className="hover:text-[#061a3a]">
              Shop
            </Link>

            {product.category && (
              <>
                <span>/</span>

                <Link
                  href={`/shop?category=${encodeURIComponent(
                    product.category.slug
                  )}`}
                  className="hover:text-[#061a3a]"
                >
                  {product.category.name}
                </Link>
              </>
            )}

            <span>/</span>

            <span className="font-semibold text-[#061a3a]">
              {product.name}
            </span>
          </div>
        </div>
      </div>

      {/* Product */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2">
          {/* Images */}
          <div>
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="aspect-square bg-slate-100">
                {primaryImage ? (
                  <img
                    src={primaryImage}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-8xl font-black text-slate-300">
                      M
                    </div>
                  </div>
                )}
              </div>
            </div>

            {images.length > 1 && (
              <div className="mt-4 grid grid-cols-4 gap-3">
                {images.map((image, index) => (
                  <div
                    key={image.id ?? `${image.image_url}-${index}`}
                    className={`aspect-square overflow-hidden rounded-xl border bg-white ${
                      index === 0
                        ? "border-[#061a3a] ring-2 ring-[#061a3a]/10"
                        : "border-slate-200"
                    }`}
                  >
                    <img
                      src={image.image_url}
                      alt={image.alt_text || product.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Information */}
          <div className="flex flex-col justify-center">
            <div className="flex flex-wrap items-center gap-2">
              {product.category && (
                <Link
                  href={`/shop?category=${encodeURIComponent(
                    product.category.slug
                  )}`}
                  className="text-sm font-bold uppercase tracking-[0.14em] text-[#b78927]"
                >
                  {product.category.name}
                </Link>
              )}

              {product.featured && (
                <span className="rounded-full bg-[#b78927] px-3 py-1 text-xs font-extrabold text-white">
                  Featured
                </span>
              )}
            </div>

            <h1 className="mt-3 text-3xl font-black tracking-tight text-[#061a3a] sm:text-4xl">
              {product.name}
            </h1>

            {product.brand && (
              <p className="mt-3 text-sm font-semibold text-slate-500">
                Brand: {product.brand}
              </p>
            )}

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
              {hasSale && (
                <div className="text-sm font-semibold text-slate-400 line-through">
                  {formatPrice(product.price)}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <span className="text-3xl font-black text-[#061a3a]">
                  {formatPrice(displayPrice)}
                </span>

                {hasSale && (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-700">
                    Save {discountPercent}%
                  </span>
                )}
              </div>
            </div>

            <div className="mt-6">
              <h2 className="text-base font-extrabold text-[#061a3a]">
                Product Description
              </h2>

              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">
                {product.description ||
                  "Quality product from MUHAJ Multi Biz."}
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Availability
                </div>

                <div className="mt-1 text-sm font-extrabold text-[#061a3a]">
                  {product.stock > 0
                    ? `${product.stock} available`
                    : "Out of Stock"}
                </div>
              </div>

              {product.sku && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    SKU
                  </div>

                  <div className="mt-1 break-all text-sm font-extrabold text-[#061a3a]">
                    {product.sku}
                  </div>
                </div>
              )}

              {product.weight !== null && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Weight
                  </div>

                  <div className="mt-1 text-sm font-extrabold text-[#061a3a]">
                    {product.weight}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-7">
              {product.stock > 0 ? (
                <AddToCartButton
                  product={{
                    id: product.id,
                    name: product.name,
                    slug: product.slug,
                    price: displayPrice,
                    image_url: primaryImage,
                  }}
                  maxStock={product.stock}
                />
              ) : (
                <div className="rounded-xl bg-slate-200 px-6 py-4 text-center text-sm font-extrabold text-slate-500">
                  This product is currently out of stock.
                </div>
              )}
            </div>

            <a
              href={getWhatsAppUrl(product.name, product.slug)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-3.5 text-sm font-extrabold text-emerald-700 transition hover:bg-emerald-100"
            >
              Order on WhatsApp
            </a>

            <Link
              href="/shop"
              className="mt-4 text-center text-sm font-bold text-slate-500 transition hover:text-[#061a3a]"
            >
              â† Continue Shopping
            </Link>
          </div>
        </div>
      </section>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="mb-7">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#b78927]">
                YOU MAY ALSO LIKE
              </p>

              <h2 className="mt-2 text-2xl font-black tracking-tight text-[#061a3a]">
                More from {product.category?.name ?? "MUHAJ"}
              </h2>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {relatedProducts.map((related) => {
                const relatedImage = getProductImage(
                  related.product_images ?? []
                );

                const relatedSale =
                  related.sale_price !== null &&
                  related.sale_price < related.price;

                return (
                  <article
                    key={related.id}
                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <Link href={`/products/${related.slug}`}>
                      <div className="aspect-square overflow-hidden bg-slate-100">
                        {relatedImage ? (
                          <img
                            src={relatedImage}
                            alt={related.name}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <div className="text-5xl font-black text-slate-300">
                              M
                            </div>
                          </div>
                        )}
                      </div>
                    </Link>

                    <div className="p-4">
                      <Link href={`/products/${related.slug}`}>
                        <h3 className="line-clamp-2 text-base font-extrabold text-[#061a3a] group-hover:text-[#b78927]">
                          {related.name}
                        </h3>
                      </Link>

                      <div className="mt-3">
                        {relatedSale && (
                          <span className="mr-2 text-xs font-semibold text-slate-400 line-through">
                            {formatPrice(related.price)}
                          </span>
                        )}

                        <span className="text-base font-black text-[#061a3a]">
                          {formatPrice(
                            relatedSale
                              ? (related.sale_price as number)
                              : related.price
                          )}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Delivery */}
      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-[#061a3a] px-6 py-8 text-white sm:px-10">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#d5ad58]">
                  MUHAJ DELIVERY
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  Nationwide Delivery Available
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-200">
                  Shop from Bauchi and receive your order anywhere in Nigeria.
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