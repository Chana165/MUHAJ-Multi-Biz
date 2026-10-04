import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  ClipboardList,
  Package,
  Plus,
  ShoppingCart,
  Users,
} from "lucide-react";

import AdminShell from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Admin Dashboard | MUHAJ Multi Biz",
};

export default async function AdminDashboardPage() {
  const { profile } = await requireAdmin();
  const supabase = await createClient();

  const [
    { count: productCount },
    { count: categoryCount },
    { count: customerCount },
    { count: orderCount },
    { data: paidOrders },
  ] = await Promise.all([
    supabase
      .from("products")
      .select("*", { count: "exact", head: true }),

    supabase
      .from("categories")
      .select("*", { count: "exact", head: true }),

    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "customer"),

    supabase
      .from("orders")
      .select("*", { count: "exact", head: true }),

    supabase
      .from("orders")
      .select("total_amount")
      .eq("payment_status", "paid"),
  ]);

  const revenue =
    paidOrders?.reduce(
      (total, order) => total + Number(order.total_amount ?? 0),
      0,
    ) ?? 0;

  return (
    <AdminShell
      profile={profile}
      activeHref="/admin"
    >
      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6">
        <div className="rounded-3xl bg-slate-900 p-7 text-white shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-amber-400">
            MUHAJ Multi Biz · Snacks and More
          </p>

          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            Welcome back, {profile.full_name || "Administrator"}.
          </h1>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/admin/products"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300"
            >
              Manage Products
              <ArrowRight size={17} />
            </Link>

            <Link
              href="/admin/products/new"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-amber-400 hover:text-amber-400"
            >
              <Plus size={17} />
              Add Product
            </Link>
          </div>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Link
            href="/admin/products"
            className="rounded-2xl bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Products
                </p>

                <p className="mt-2 text-3xl font-black text-slate-900">
                  {productCount ?? 0}
                </p>
              </div>

              <div className="rounded-xl bg-slate-900 p-3 text-amber-400">
                <Package size={21} />
              </div>
            </div>

            <p className="mt-4 text-xs font-semibold text-amber-700">
              Manage catalogue →
            </p>
          </Link>

          <Link
            href="/admin/categories"
            className="rounded-2xl bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-semibold text-slate-500">
              Categories
            </p>

            <p className="mt-2 text-3xl font-black text-slate-900">
              {categoryCount ?? 0}
            </p>

            <p className="mt-4 text-xs font-semibold text-amber-700">
              Manage categories →
            </p>
          </Link>

          <Link
            href="/admin/customers"
            className="rounded-2xl bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-semibold text-slate-500">
              Customers
            </p>

            <p className="mt-2 text-3xl font-black text-slate-900">
              {customerCount ?? 0}
            </p>

            <p className="mt-4 text-xs font-semibold text-amber-700">
              View customers →
            </p>
          </Link>

          <Link
            href="/admin/analytics"
            className="rounded-2xl bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-semibold text-slate-500">
              Paid Revenue
            </p>

            <p className="mt-2 text-2xl font-black text-slate-900">
              ₦{revenue.toLocaleString("en-NG")}
            </p>

            <p className="mt-4 text-xs font-semibold text-amber-700">
              Open analytics →
            </p>
          </Link>
        </div>

        <div className="mt-7 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">
                  Quick Actions
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-900">
                  Store management
                </h2>
              </div>

              <ShoppingCart className="text-amber-600" size={24} />
            </div>

            <div className="mt-6 space-y-3">
              <Link
                href="/admin/products/new"
                className="flex items-center justify-between rounded-xl border border-slate-200 p-4 transition hover:border-amber-400"
              >
                <div className="flex items-center gap-3">
                  <Plus className="text-amber-600" size={20} />

                  <div>
                    <p className="font-bold text-slate-900">
                      Add New Product
                    </p>

                    <p className="text-xs text-slate-500">
                      Add price, description, stock and images
                    </p>
                  </div>
                </div>

                <ArrowRight size={17} className="text-slate-400" />
              </Link>

              <Link
                href="/admin/products"
                className="flex items-center justify-between rounded-xl border border-slate-200 p-4 transition hover:border-amber-400"
              >
                <div className="flex items-center gap-3">
                  <Package className="text-amber-600" size={20} />

                  <div>
                    <p className="font-bold text-slate-900">
                      Manage Products
                    </p>

                    <p className="text-xs text-slate-500">
                      Edit, archive and delete products
                    </p>
                  </div>
                </div>

                <ArrowRight size={17} className="text-slate-400" />
              </Link>

              <Link
                href="/admin/orders"
                className="flex items-center justify-between rounded-xl border border-slate-200 p-4 transition hover:border-amber-400"
              >
                <div className="flex items-center gap-3">
                  <ClipboardList className="text-amber-600" size={20} />

                  <div>
                    <p className="font-bold text-slate-900">
                      Orders
                    </p>

                    <p className="text-xs text-slate-500">
                      Open order management
                    </p>
                  </div>
                </div>

                <ArrowRight size={17} className="text-slate-400" />
              </Link>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">
                  Business Overview
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-900">
                  Current activity
                </h2>
              </div>

              <BarChart3 className="text-amber-600" size={24} />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">
                  Total Orders
                </p>

                <p className="mt-2 text-2xl font-black text-slate-900">
                  {orderCount ?? 0}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">
                  Customers
                </p>

                <p className="mt-2 text-2xl font-black text-slate-900">
                  {customerCount ?? 0}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">
                  Catalogue
                </p>

                <p className="mt-2 text-2xl font-black text-slate-900">
                  {productCount ?? 0}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">
                  Paid Revenue
                </p>

                <p className="mt-2 text-xl font-black text-slate-900">
                  ₦{revenue.toLocaleString("en-NG")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}