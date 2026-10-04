"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Eye,
  Filter,
  Loader2,
  RotateCcw,
  Search,
  X,
  XCircle,
  Clock3,
} from "lucide-react";
import { updatePaymentStatus, type Payment } from "./actions";

type Props = {
  initialPayments: Payment[];
  loadError?: string;
};

const statuses = ["all", "paid", "pending", "failed", "refunded"] as const;
type FilterStatus = (typeof statuses)[number];

function money(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function date(value: string | null) {
  if (!value) return "â€”";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "â€”"
    : new Intl.DateTimeFormat("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(d);
}

function norm(value: string) {
  return value.toLowerCase().trim();
}

function statusText(value: string) {
  const s = norm(value);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function statusStyle(value: string) {
  switch (norm(value)) {
    case "paid":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "failed":
      return "border-red-200 bg-red-50 text-red-700";
    case "refunded":
      return "border-slate-200 bg-slate-100 text-slate-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function StatusIcon({ status }: { status: string }) {
  switch (norm(status)) {
    case "paid":
      return <CheckCircle2 className="h-4 w-4" />;
    case "failed":
      return <XCircle className="h-4 w-4" />;
    case "refunded":
      return <RotateCcw className="h-4 w-4" />;
    default:
      return <Clock3 className="h-4 w-4" />;
  }
}

function Card({
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
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">
            {value}
          </p>
          {note && <p className="mt-1 text-xs text-slate-400">{note}</p>}
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#061a3a] text-amber-300">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function PaymentManager({
  initialPayments,
  loadError,
}: Props) {
  const [payments, setPayments] = useState(initialPayments);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [selected, setSelected] = useState<Payment | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const stats = useMemo(() => {
    const count = (status: string) =>
      payments.filter((p) => norm(p.status) === status).length;

    const paidValue = payments
      .filter((p) => norm(p.status) === "paid")
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      total: payments.length,
      paid: count("paid"),
      pending: count("pending"),
      failed: count("failed"),
      refunded: count("refunded"),
      paidValue,
    };
  }, [payments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return payments.filter((p) => {
      const matchesFilter =
        filter === "all" || norm(p.status) === filter;

      if (!matchesFilter) return false;
      if (!q) return true;

      return [
        p.customerName,
        p.customerEmail,
        p.reference,
        p.orderId ?? "",
        p.method,
        p.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [payments, search, filter]);

  function changeStatus(payment: Payment, status: string) {
    setError("");

    startTransition(async () => {
      const result = await updatePaymentStatus(payment.id, status);

      if (!result.success) {
        setError(result.error ?? "Unable to update payment.");
        return;
      }

      setPayments((items) =>
        items.map((item) =>
          item.id === payment.id ? { ...item, status } : item
        )
      );

      setSelected((item) =>
        item?.id === payment.id ? { ...item, status } : item
      );
    });
  }

  return (
    <div className="admin-module-page space-y-6">
      <div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          Payment Management
        </h1>
      </div>

      {(loadError || error) && (
        <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Payment notice</p>
            <p className="mt-1">{loadError || error}</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card title="Total Payments" value={String(stats.total)} icon={<CreditCard className="h-5 w-5" />} />
        <Card title="Paid" value={String(stats.paid)} icon={<CheckCircle2 className="h-5 w-5" />} />
        <Card title="Pending" value={String(stats.pending)} icon={<Clock3 className="h-5 w-5" />} />
        <Card title="Failed" value={String(stats.failed)} icon={<XCircle className="h-5 w-5" />} />
        <Card
          title="Refunded"
          value={String(stats.refunded)}
          note={`Paid value: ${money(stats.paidValue)}`}
          icon={<RotateCcw className="h-5 w-5" />}
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Payment List
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {filtered.length} payment{filtered.length === 1 ? "" : "s"} shown
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative sm:w-[300px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search payment, order or customer..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#061a3a] focus:ring-2 focus:ring-[#061a3a]/10"
                />
              </div>

              <div className="relative">
                <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as FilterStatus)}
                  className="h-11 min-w-[170px] appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-8 text-sm font-medium text-slate-700 outline-none focus:border-[#061a3a] focus:ring-2 focus:ring-[#061a3a]/10"
                >
                  <option value="all">All Payments</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-16 text-center sm:px-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <CreditCard className="h-6 w-6" />
            </div>

            <h3 className="mt-4 font-bold text-slate-950">
              No payments found
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Payment records will appear here when customers complete
              purchases through the storefront.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[950px]">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-4 py-4">Order</th>
                    <th className="px-4 py-4">Amount</th>
                    <th className="px-4 py-4">Method</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Date</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filtered.map((payment) => (
                    <tr key={payment.id} className="hover:bg-slate-50">
                      <td className="px-6 py-5">
                        <p className="font-semibold text-slate-900">
                          {payment.customerName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {payment.customerEmail}
                        </p>
                      </td>

                      <td className="px-4 py-5">
                        <p className="font-medium text-slate-800">
                          {payment.orderNumber ?? "—"}
                        </p>
                        <p className="mt-1 max-w-[180px] truncate text-xs text-slate-400">
                          {payment.reference}
                        </p>
                      </td>

                      <td className="px-4 py-5 font-semibold text-slate-900">
                        {money(payment.amount)}
                      </td>

                      <td className="px-4 py-5 text-sm text-slate-600">
                        {payment.method}
                      </td>

                      <td className="px-4 py-5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusStyle(payment.status)}`}>
                          <StatusIcon status={payment.status} />
                          {statusText(payment.status)}
                        </span>
                      </td>

                      <td className="px-4 py-5 text-sm text-slate-600">
                        {date(payment.createdAt)}
                      </td>

                      <td className="px-6 py-5 text-right">
                        <button
                          onClick={() => setSelected(payment)}
                          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 lg:hidden">
              {filtered.map((payment) => (
                <div key={payment.id} className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-950">
                        {payment.customerName}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {payment.customerEmail}
                      </p>
                    </div>

                    <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusStyle(payment.status)}`}>
                      <StatusIcon status={payment.status} />
                      {statusText(payment.status)}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-400">Amount</p>
                      <p className="mt-1 font-bold text-slate-900">
                        {money(payment.amount)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">Order</p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {payment.orderNumber ?? "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">Method</p>
                      <p className="mt-1 text-sm text-slate-700">
                        {payment.method}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">Date</p>
                      <p className="mt-1 text-sm text-slate-700">
                        {date(payment.createdAt)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelected(payment)}
                    className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Eye className="h-4 w-4" />
                    View Payment
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5 sm:px-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-amber-700">
                  Payment Details
                </p>
                <h3 className="mt-1 text-xl font-bold text-slate-950">
                  {money(selected.amount)}
                </h3>
              </div>

              <button
                onClick={() => setSelected(null)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-5 py-6 sm:px-6">
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ["Customer", selected.customerName],
                  ["Email", selected.customerEmail],
                  ["Order", selected.orderNumber ?? "Not linked"],
                  ["Method", selected.method],
                  ["Reference", selected.reference],
                  ["Date", date(selected.createdAt)],
                ].map(([label, text]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      {label}
                    </p>
                    <p className="mt-2 break-all text-sm font-semibold text-slate-900">
                      {text}
                    </p>
                  </div>
                ))}
              </div>

              <div>
                <h4 className="font-bold text-slate-950">
                  Payment Status
                </h4>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {["pending", "paid", "failed", "refunded"].map((status) => {
                    const active = norm(selected.status) === status;

                    return (
                      <button
                        key={status}
                        disabled={pending || active}
                        onClick={() => changeStatus(selected, status)}
                        className={`flex h-11 items-center justify-center rounded-xl border text-sm font-semibold capitalize ${
                          active
                            ? "border-[#061a3a] bg-[#061a3a] text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        } disabled:opacity-60`}
                      >
                        {pending && !active ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          status
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
              <button
                onClick={() => setSelected(null)}
                className="ml-auto flex h-10 items-center rounded-xl bg-[#061a3a] px-5 text-sm font-semibold text-white hover:bg-[#0a2857]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
