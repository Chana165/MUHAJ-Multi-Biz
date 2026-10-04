"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock3,
  CreditCard,
  Package,
  ShoppingBag,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import type { AnalyticsData } from "./actions";

type Props = {
  initialData: AnalyticsData | null;
  loadError?: string;
};

function money(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function date(value: string | null) {
  if (!value) return "—";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) return "—";

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function label(value: string) {
  const text = normalize(value);

  if (text === "pending") return "Pending";
  if (text === "confirmed") return "Confirmed";
  if (text === "processing") return "Processing";
  if (text === "shipped") return "Shipped";
  if (text === "delivered") return "Delivered";
  if (text === "cancelled" || text === "canceled") return "Cancelled";
  if (text === "paid") return "Paid";
  if (text === "refunded") return "Refunded";

  return text.charAt(0).toUpperCase() + text.slice(1);
}

function statusClass(status: string) {
  switch (normalize(status)) {
    case "delivered":
    case "paid":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "processing":
    case "confirmed":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "shipped":
      return "border-violet-200 bg-violet-50 text-violet-700";

    case "cancelled":
    case "canceled":
    case "failed":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function StatusIcon({ status }: { status: string }) {
  const normalized = normalize(status);

  if (
    normalized === "delivered" ||
    normalized === "paid"
  ) {
    return <CheckCircle2 className="h-4 w-4" />;
  }

  if (
    normalized === "cancelled" ||
    normalized === "canceled" ||
    normalized === "failed"
  ) {
    return <XCircle className="h-4 w-4" />;
  }

  return <Clock3 className="h-4 w-4" />;
}

function StatCard({
  title,
  value,
  icon,
  note,
}: {
  title: string;
  value: string;
  icon: ReactNode;
  note?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            {value}
          </p>

          {note ? (
            <p className="mt-1 text-xs text-slate-400">
              {note}
            </p>
          ) : null}
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#061a3a] text-amber-300">
          {icon}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-950">
        {title}
      </h2>

      {subtitle ? (
        <p className="mt-1 text-sm text-slate-500">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export default function AnalyticsManager({
  initialData,
  loadError,
}: Props) {
  const [days, setDays] = useState(30);

  const data = initialData ?? {
    revenue: 0,
    orders: 0,
    customers: 0,
    products: 0,
    unitsSold: 0,
    salesSeries: [],
    orderStatuses: [],
    topProducts: [],
    recentActivity: [],
  };

  const maxRevenue = useMemo(() => {
    return Math.max(
      ...data.salesSeries.map((item) => item.revenue),
      1
    );
  }, [data.salesSeries]);

  const statusTotal = useMemo(() => {
    return data.orderStatuses.reduce(
      (sum, item) => sum + item.count,
      0
    );
  }, [data.orderStatuses]);

  const filteredSeries = useMemo(() => {
    if (data.salesSeries.length <= days) {
      return data.salesSeries;
    }

    return data.salesSeries.slice(-days);
  }, [data.salesSeries, days]);

  const seriesStep = filteredSeries.length > 15
    ? Math.ceil(filteredSeries.length / 10)
    : 1;

  return (
    <div className="admin-module-page space-y-6">
      <div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          Business Analytics
        </h1>
      </div>

      {loadError ? (
        <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />

          <div>
            <p className="font-semibold">
              Unable to load analytics
            </p>

            <p className="mt-1">{loadError}</p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={money(data.revenue)}
          icon={<TrendingUp className="h-5 w-5" />}
        />

        <StatCard
          title="Orders"
          value={String(data.orders)}
          icon={<ShoppingBag className="h-5 w-5" />}
        />

        <StatCard
          title="Customers"
          value={String(data.customers)}
          icon={<Users className="h-5 w-5" />}
        />

        <StatCard
          title="Products Sold"
          value={String(data.unitsSold)}
          note={`${data.products} products in catalog`}
          icon={<Package className="h-5 w-5" />}
        />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <SectionTitle
            title="Sales Overview"
            subtitle="Daily revenue and order activity"
          />

          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            {[7, 30, 90].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setDays(value)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  days === value
                    ? "bg-[#061a3a] text-white shadow-sm"
                    : "text-slate-600 hover:bg-white"
                }`}
              >
                {value} days
              </button>
            ))}
          </div>
        </div>

        {filteredSeries.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <BarChart3 className="h-6 w-6" />
            </div>

            <h3 className="mt-4 font-bold text-slate-950">
              No sales data yet
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              Sales activity will appear here after customers begin
              placing and paying for orders.
            </p>
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto">
            <div className="min-w-[720px]">
              <div className="flex h-[280px] items-end gap-2 border-b border-l border-slate-200 px-3 pb-0">
                {filteredSeries.map((item) => {
                  const height =
                    maxRevenue > 0
                      ? Math.max(
                          item.revenue > 0
                            ? 8
                            : 2,
                          (item.revenue / maxRevenue) * 220
                        )
                      : 2;

                  return (
                    <div
                      key={item.label + item.orders}
                      className="group flex h-full min-w-[18px] flex-1 flex-col justify-end"
                    >
                      <div className="relative flex h-full items-end justify-center">
                        <div
                          className="w-full max-w-[28px] rounded-t-md bg-[#061a3a] transition group-hover:bg-[#0a2857]"
                          style={{ height }}
                          title={`${item.label}: ${money(item.revenue)} • ${item.orders} orders`}
                        />
                      </div>

                      <div className="mt-3 h-5 text-center text-[10px] text-slate-400">
                        {filteredSeries.indexOf(item) % seriesStep === 0
                          ? item.label
                          : ""}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Revenue is based on paid payment records.
                </span>

                <span>
                  {filteredSeries.reduce(
                    (sum, item) => sum + item.orders,
                    0
                  )}{" "}
                  orders in selected period
                </span>
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
            <SectionTitle
              title="Order Status"
              subtitle={`${statusTotal} total orders`}
            />
          </div>

          {data.orderStatuses.length === 0 ? (
            <div className="px-5 py-14 text-center sm:px-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <ShoppingBag className="h-5 w-5" />
              </div>

              <p className="mt-3 text-sm font-semibold text-slate-900">
                No orders yet
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Order status activity will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-5 px-5 py-5 sm:px-6">
              {data.orderStatuses.map((item) => {
                const percentage =
                  statusTotal > 0
                    ? (item.count / statusTotal) * 100
                    : 0;

                return (
                  <div key={item.status}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                            item.status
                          )}`}
                        >
                          <StatusIcon status={item.status} />
                          {label(item.status)}
                        </span>
                      </div>

                      <span className="text-sm font-bold text-slate-900">
                        {item.count}
                      </span>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[#061a3a]"
                        style={{
                          width: `${percentage}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
            <SectionTitle
              title="Top Products"
              subtitle="Products with the most units sold"
            />
          </div>

          {data.topProducts.length === 0 ? (
            <div className="px-5 py-14 text-center sm:px-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <Package className="h-5 w-5" />
              </div>

              <p className="mt-3 text-sm font-semibold text-slate-900">
                No product sales yet
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Best-selling products will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.topProducts.map((product, index) => (
                <div
                  key={product.name}
                  className="flex items-center gap-4 px-5 py-4 sm:px-6"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700">
                    {index + 1}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">
                      {product.name}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {product.units} unit
                      {product.units === 1 ? "" : "s"} sold
                    </p>
                  </div>

                  <p className="shrink-0 text-sm font-bold text-slate-900">
                    {money(product.revenue)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
          <SectionTitle
            title="Recent Activity"
            subtitle="Latest order and payment activity"
          />
        </div>

        {data.recentActivity.length === 0 ? (
          <div className="px-5 py-14 text-center sm:px-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <CreditCard className="h-5 w-5" />
            </div>

            <p className="mt-3 text-sm font-semibold text-slate-900">
              No activity yet
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Recent sales activity will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px]">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-6 py-4">Activity</th>
                    <th className="px-4 py-4">Amount</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Date</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {data.recentActivity.map((item) => (
                    <tr key={`${item.type}-${item.id}`}>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            {item.type === "order" ? (
                              <ShoppingBag className="h-4 w-4" />
                            ) : (
                              <CreditCard className="h-4 w-4" />
                            )}
                          </div>

                          <div>
                            <p className="font-semibold text-slate-900">
                              {item.title}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {item.type === "order"
                                ? "Order activity"
                                : "Payment activity"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-5 font-semibold text-slate-900">
                        {money(item.amount)}
                      </td>

                      <td className="px-4 py-5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusClass(
                            item.status
                          )}`}
                        >
                          <StatusIcon status={item.status} />
                          {label(item.status)}
                        </span>
                      </td>

                      <td className="px-4 py-5 text-sm text-slate-600">
                        {date(item.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 md:hidden">
              {data.recentActivity.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="p-5 sm:p-6"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      {item.type === "order" ? (
                        <ShoppingBag className="h-4 w-4" />
                      ) : (
                        <CreditCard className="h-4 w-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold text-slate-900">
                          {item.title}
                        </p>

                        <p className="shrink-0 font-bold text-slate-900">
                          {money(item.amount)}
                        </p>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                            item.status
                          )}`}
                        >
                          <StatusIcon status={item.status} />
                          {label(item.status)}
                        </span>

                        <span className="text-xs text-slate-400">
                          {date(item.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}