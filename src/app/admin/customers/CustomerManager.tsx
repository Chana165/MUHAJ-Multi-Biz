"use client";

import {
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  CircleUserRound,
  Clock3,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  ShoppingBag,
  UserRound,
  Users,
  X,
} from "lucide-react";
import {
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { Customer } from "./actions";

type Props = {
  initialCustomers: Customer[];
  stats: {
    totalCustomers: number;
    registeredCustomers: number;
    guestCustomers: number;
    repeatCustomers: number;
    totalSpent: number;
  };
  loadError?: string;
};

type Filter =
  | "all"
  | "registered"
  | "guest"
  | "repeat";

function formatCurrency(
  value: number
) {
  return new Intl.NumberFormat(
    "en-NG",
    {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }
  ).format(value);
}

function formatDate(
  value: string | null
) {
  if (!value) {
    return "No order yet";
  }

  try {
    return new Intl.DateTimeFormat(
      "en-NG",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    ).format(
      new Date(value)
    );
  } catch {
    return "No order yet";
  }
}

function statusLabel(
  status: string
) {
  if (!status) {
    return "Pending";
  }

  return status
    .replace(/[_-]+/g, " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function statusClass(
  status: string
) {
  const normalized =
    status.toLowerCase();

  if (
    [
      "delivered",
      "completed",
      "paid",
      "success",
      "successful",
    ].includes(normalized)
  ) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (
    [
      "cancelled",
      "canceled",
      "refunded",
      "failed",
    ].includes(normalized)
  ) {
    return "bg-red-50 text-red-700";
  }

  if (
    [
      "shipped",
      "confirmed",
      "processing",
    ].includes(normalized)
  ) {
    return "bg-blue-50 text-blue-700";
  }

  return "bg-amber-50 text-amber-700";
}

export default function CustomerManager({
  initialCustomers,
  stats,
  loadError,
}: Props) {
  const router = useRouter();

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    filter,
    setFilter,
  ] = useState<Filter>("all");

  const [
    sort,
    setSort,
  ] = useState<
    "recent" | "spent" | "orders"
  >("recent");

  const [
    selected,
    setSelected,
  ] = useState<Customer | null>(
    null
  );

  const filtered =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      const result =
        initialCustomers.filter(
          (customer) => {
            if (
              filter ===
              "registered" &&
              customer.isGuest
            ) {
              return false;
            }

            if (
              filter ===
              "guest" &&
              !customer.isGuest
            ) {
              return false;
            }

            if (
              filter ===
              "repeat" &&
              customer.orderCount <
                2
            ) {
              return false;
            }

            if (!query) {
              return true;
            }

            return [
              customer.name,
              customer.email,
              customer.phone,
              customer.city,
              customer.state,
              customer.lastOrderNumber,
            ]
              .join(" ")
              .toLowerCase()
              .includes(query);
          }
        );

      result.sort(
        (a, b) => {
          if (
            sort === "spent"
          ) {
            return (
              b.totalSpent -
              a.totalSpent
            );
          }

          if (
            sort === "orders"
          ) {
            return (
              b.orderCount -
              a.orderCount
            );
          }

          const aTime =
            a.lastOrderAt
              ? new Date(
                  a.lastOrderAt
                ).getTime()
              : 0;

          const bTime =
            b.lastOrderAt
              ? new Date(
                  b.lastOrderAt
                ).getTime()
              : 0;

          return (
            bTime - aTime
          );
        }
      );

      return result;
    }, [
      filter,
      initialCustomers,
      search,
      sort,
    ]);

  const statCards = [
    {
      label: "Total Customers",
      value:
        stats.totalCustomers,
      icon: Users,
    },
    {
      label: "Registered",
      value:
        stats.registeredCustomers,
      icon: UserRound,
    },
    {
      label: "Guest Customers",
      value:
        stats.guestCustomers,
      icon: CircleUserRound,
    },
    {
      label: "Repeat Customers",
      value:
        stats.repeatCustomers,
      icon: ShoppingBag,
    },
  ];

  return (
    <div className="admin-module-page space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500">
            Customer Management
          </p>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Customers
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Live customers built from registered profiles and real store orders,
            including guest checkouts.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            router.refresh()
          }
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <p className="font-semibold">
            Customer data could not be loaded.
          </p>
          <p className="mt-1">
            {loadError}
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(
          ({
            label,
            value,
            icon: Icon,
          }) => (
            <div
              key={label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <Icon className="h-5 w-5" />
                </div>

                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Live
                </span>
              </div>

              <p className="mt-5 text-2xl font-bold tracking-tight text-slate-950">
                {value.toLocaleString(
                  "en-NG"
                )}
              </p>

              <p className="mt-1 text-sm font-medium text-slate-500">
                {label}
              </p>
            </div>
          )
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Customer Lifetime Spend
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            {formatCurrency(
              stats.totalSpent
            )}
          </p>

          <p className="mt-1 text-xs font-medium text-slate-400">
            Based on non-cancelled orders.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Repeat Customer Rate
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            {stats.totalCustomers
              ? Math.round(
                  (stats.repeatCustomers /
                    stats.totalCustomers) *
                    100
                )
              : 0}
            %
          </p>

          <p className="mt-1 text-xs font-medium text-slate-400">
            Customers with more than one order.
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Customer Accounts
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {filtered.length.toLocaleString(
                  "en-NG"
                )} customer
                {filtered.length === 1
                  ? ""
                  : "s"} shown.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search customers..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#061a3a] focus:ring-2 focus:ring-[#061a3a]/10"
                />
              </div>

              <select
                value={filter}
                onChange={(event) =>
                  setFilter(
                    event.target
                      .value as Filter
                  )
                }
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-[#061a3a] focus:ring-2 focus:ring-[#061a3a]/10"
              >
                <option value="all">
                  All Customers
                </option>
                <option value="registered">
                  Registered
                </option>
                <option value="guest">
                  Guest
                </option>
                <option value="repeat">
                  Repeat
                </option>
              </select>

              <select
                value={sort}
                onChange={(event) =>
                  setSort(
                    event.target
                      .value as
                      | "recent"
                      | "spent"
                      | "orders"
                  )
                }
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-[#061a3a] focus:ring-2 focus:ring-[#061a3a]/10"
              >
                <option value="recent">
                  Recent Order
                </option>
                <option value="spent">
                  Highest Spend
                </option>
                <option value="orders">
                  Most Orders
                </option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Users className="h-5 w-5" />
              </div>

              <p className="mt-4 font-semibold text-slate-800">
                No customers found
              </p>

              <p className="mt-1 max-w-md text-sm text-slate-500">
                Try another search term or change the customer filter.
              </p>
            </div>
          ) : (
            <table className="min-w-[980px] w-full text-left">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3.5">
                    Customer
                  </th>
                  <th className="px-5 py-3.5">
                    Type
                  </th>
                  <th className="px-5 py-3.5">
                    Orders
                  </th>
                  <th className="px-5 py-3.5">
                    Total Spent
                  </th>
                  <th className="px-5 py-3.5">
                    Last Order
                  </th>
                  <th className="px-5 py-3.5 text-right">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filtered.map(
                  (customer) => (
                    <tr
                      key={customer.id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                            {customer.name
                              .trim()
                              .charAt(0)
                              .toUpperCase() ||
                              "C"}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">
                              {customer.name}
                            </p>

                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                              {customer.email ? (
                                <span className="inline-flex items-center gap-1">
                                  <Mail className="h-3.5 w-3.5" />
                                  {customer.email}
                                </span>
                              ) : null}

                              {customer.phone ? (
                                <span className="inline-flex items-center gap-1">
                                  <Phone className="h-3.5 w-3.5" />
                                  {customer.phone}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                            customer.isGuest
                              ? "bg-slate-100 text-slate-700"
                              : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {customer.isGuest
                            ? "Guest"
                            : "Registered"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="h-4 w-4 text-slate-400" />
                          <span className="font-semibold text-slate-800">
                            {customer.orderCount}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {formatCurrency(
                            customer.totalSpent
                          )}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-slate-700">
                          {formatDate(
                            customer.lastOrderAt
                          )}
                        </p>

                        {customer.lastOrderNumber ? (
                          <p className="mt-1 text-xs text-slate-400">
                            {customer.lastOrderNumber}
                          </p>
                        ) : null}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setSelected(
                              customer
                            )
                          }
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          View
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {selected ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
          onClick={() =>
            setSelected(null)
          }
        >
          <div
            className="max-h-[90vh] w-full overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-3xl sm:rounded-3xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600">
                      {selected.name
                        .trim()
                        .charAt(0)
                        .toUpperCase() ||
                        "C"}
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate text-xl font-bold text-slate-950">
                        {selected.name}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        {selected.isGuest
                          ? "Guest customer"
                          : "Registered customer"}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelected(null)
                  }
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close customer details"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Orders
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-950">
                    {selected.orderCount}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Total Spent
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-950">
                    {formatCurrency(
                      selected.totalSpent
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Last Order
                  </p>
                  <p className="mt-1 truncate text-sm font-bold text-slate-950">
                    {selected.lastOrderNumber ||
                      "No order number"}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
                {selected.email ? (
                  <span className="inline-flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {selected.email}
                  </span>
                ) : null}

                {selected.phone ? (
                  <span className="inline-flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {selected.phone}
                  </span>
                ) : null}

                {selected.city ||
                selected.state ? (
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {[selected.city, selected.state]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="max-h-[55vh] overflow-y-auto px-5 py-5 sm:px-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-950">
                    Order History
                  </h4>
                  <p className="mt-1 text-xs text-slate-500">
                    {selected.orderCount} order
                    {selected.orderCount === 1
                      ? ""
                      : "s"} on record.
                  </p>
                </div>

                <CalendarDays className="h-5 w-5 text-slate-300" />
              </div>

              <div className="mt-4 space-y-3">
                {selected.orders.length ===
                0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-10 text-center text-sm text-slate-500">
                    No orders recorded for this customer.
                  </div>
                ) : (
                  selected.orders.map(
                    (order, index) => (
                      <div
                        key={
                          order.id ||
                          `${selected.id}-${index}`
                        }
                        className="rounded-2xl border border-slate-200 bg-white p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-bold text-slate-900">
                              {order.orderNumber}
                            </p>

                            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-500">
                              <Clock3 className="h-3.5 w-3.5" />
                              {formatDate(
                                order.createdAt
                              )}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(
                                order.status
                              )}`}
                            >
                              {statusLabel(
                                order.status
                              )}
                            </span>

                            <p className="font-bold text-slate-900">
                              {formatCurrency(
                                order.total
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  )
                )}
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={() =>
                  setSelected(null)
                }
                className="ml-auto inline-flex h-10 items-center justify-center rounded-xl bg-[#061a3a] px-5 text-sm font-semibold text-white transition hover:bg-[#0a2857]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}