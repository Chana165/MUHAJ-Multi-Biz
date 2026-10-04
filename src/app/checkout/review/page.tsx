import Link from "next/link";
import OrderReviewClient from "@/components/store/OrderReviewClient";

export default function OrderReviewPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Announcement */}
      <div className="bg-[#061a3a] px-4 py-2.5 text-center text-sm font-medium text-white">
        Nationwide Delivery Available • Shop MUHAJ Multi Biz
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

          <div className="hidden text-sm font-bold text-slate-400 sm:block">
            Checkout → Review
          </div>

          <Link
            href="/cart"
            className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-[#061a3a] transition hover:border-[#061a3a]"
          >
            Cart
          </Link>
        </div>
      </header>

      {/* Heading */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#b78927]">
            STEP 4
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#061a3a] sm:text-4xl">
            Review Your Order
          </h1>

          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Carefully review your customer information, delivery address,
            products and total before the order is submitted.
          </p>
        </div>
      </section>

      {/* Review */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <OrderReviewClient />
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
            © 2026 MUHAJ Multi Biz. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}