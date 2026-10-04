"use client";

import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Mail,
  Phone,
  Search,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

export type AdminCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  orders: number;
  spent: number;
  address: string;
  createdAt: string;
};

type Props = {
  initialCustomers: AdminCustomer[];
};

function money(value: number) {
  return `₦${Number(value || 0).toLocaleString(
    "en-NG",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  )}`;
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat(
      "en-NG",
      {
        dateStyle: "medium",
      }
    ).format(new Date(value));
  } catch {
    return value;
  }
}

export default function CustomerManager({
  initialCustomers,
}: Props) {
  const [
    customers,
  ] = useState<AdminCustomer[]>(
    initialCustomers
  );

  const [search, setSearch] =
    useState("");

  const [
    selectedCustomer,
    setSelectedCustomer,
  ] = useState<AdminCustomer | null>(
    null
  );

  const [
    message,
    setMessage,
  ] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const totalCustomers =
    customers.length;

  const customersWithOrders =
    customers.filter(
      (customer) =>
        customer.orders > 0
    ).length;

  const totalRevenue =
    customers.reduce(
      (total, customer) =>
        total + customer.spent,
      0
    );

  const filteredCustomers =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return customers;
      }

      return customers.filter(
        (customer) =>
          customer.name
            .toLowerCase()
            .includes(query) ||
          customer.email
            .toLowerCase()
            .includes(query) ||
          customer.phone
            .toLowerCase()
            .includes(query)
      );
    }, [customers, search]);

  function openCustomer(
    customer: AdminCustomer
  ) {
    setMessage(null);
    setSelectedCustomer(customer);
  }

  function closeCustomer() {
    setSelectedCustomer(null);
  }

  return (
    <div className="admin-module-page space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#071a3a] text-[#d4af37]">
            <UserRound className="h-5 w-5" />
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#b28b16]">
              Customer management
            </p>

            <h1 className="text-2xl font-black tracking-tight text-[#071a3a] sm:text-3xl">
              Customers
            </h1>
          </div>
        </div>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
          View your customers, their order activity
          and basic contact information.
        </p>
      </div>

      {message && (
        <div
          className={`flex items-start gap-3 rounded-2xl border px-4 py-4 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}

          <p className="flex-1 font-medium">
            {message.text}
          </p>

          <button
            type="button"
            onClick={() =>
              setMessage(null)
            }
            className="rounded-lg p-1 hover:bg-black/5"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Total Customers
              </p>

              <p className="mt-2 text-3xl font-black text-[#071a3a]">
                {totalCustomers}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#071a3a]/5 text-[#071a3a]">
              <UserRound className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Customers With Orders
              </p>

              <p className="mt-2 text-3xl font-black text-emerald-700">
                {customersWithOrders}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-2 xl:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Customer Order Value
              </p>

              <p className="mt-2 text-2xl font-black text-[#071a3a]">
                {money(totalRevenue)}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#d4af37]/15 text-[#b28b16]">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Customer list */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-black text-[#071a3a]">
                Customer List
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {filteredCustomers.length} customer
                {filteredCustomers.length === 1
                  ? ""
                  : "s"} shown
              </p>
            </div>

            <div className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search customers..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[#d4af37] focus:bg-white focus:ring-2 focus:ring-[#d4af37]/20"
              />
            </div>
          </div>
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <UserRound className="h-6 w-6" />
            </div>

            <h3 className="mt-4 text-base font-bold text-[#071a3a]">
              No customers found
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Customer accounts will appear
              here when they register.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[900px]">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-left">
                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Customer
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Contact
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Orders
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Total Spent
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Joined
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCustomers.map(
                    (customer) => (
                      <tr
                        key={customer.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#071a3a] text-sm font-black text-[#d4af37]">
                              {customer.name
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <p className="font-bold text-[#071a3a]">
                                {customer.name}
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                {customer.role}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p className="max-w-[250px] truncate text-sm text-slate-600">
                            {customer.email ||
                              "No email"}
                          </p>

                          {customer.phone && (
                            <p className="mt-1 text-xs text-slate-400">
                              {customer.phone}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span className="font-bold text-[#071a3a]">
                            {customer.orders}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm font-black text-[#071a3a]">
                          {money(
                            customer.spent
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-500">
                          {formatDate(
                            customer.createdAt
                          )}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              openCustomer(
                                customer
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-700 transition hover:border-[#d4af37] hover:text-[#071a3a]"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile / tablet */}
            <div className="divide-y divide-slate-100 lg:hidden">
              {filteredCustomers.map(
                (customer) => (
                  <article
                    key={customer.id}
                    className="p-5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#071a3a] text-sm font-black text-[#d4af37]">
                        {customer.name
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-[#071a3a]">
                          {customer.name}
                        </h3>

                        <p className="mt-1 break-all text-xs text-slate-500">
                          {customer.email ||
                            "No email"}
                        </p>

                        {customer.phone && (
                          <p className="mt-1 text-xs text-slate-400">
                            {customer.phone}
                          </p>
                        )}

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                              Orders
                            </p>

                            <p className="mt-1 font-black text-[#071a3a]">
                              {customer.orders}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                              Spent
                            </p>

                            <p className="mt-1 font-black text-[#071a3a]">
                              {money(
                                customer.spent
                              )}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            openCustomer(
                              customer
                            )
                          }
                          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#071a3a] px-4 py-3 text-xs font-bold text-[#d4af37]"
                        >
                          <Eye className="h-4 w-4" />
                          View Customer
                        </button>
                      </div>
                    </div>
                  </article>
                )
              )}
            </div>
          </>
        )}
      </section>

      {/* Customer detail */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#071a3a]/50 p-0 backdrop-blur-sm sm:items-center sm:p-5">
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-xl sm:rounded-3xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b28b16]">
                  Customer
                </p>

                <h2 className="mt-1 text-xl font-black text-[#071a3a]">
                  Customer Details
                </h2>
              </div>

              <button
                type="button"
                onClick={
                  closeCustomer
                }
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#071a3a] text-xl font-black text-[#d4af37]">
                  {selectedCustomer.name
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="min-w-0">
                  <h3 className="text-lg font-black text-[#071a3a]">
                    {selectedCustomer.name}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Customer
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-[#b28b16]" />

                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Email
                    </p>
                  </div>

                  <p className="mt-2 break-all text-sm font-semibold text-[#071a3a]">
                    {selectedCustomer.email ||
                      "Not provided"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-[#b28b16]" />

                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Phone
                    </p>
                  </div>

                  <p className="mt-2 text-sm font-semibold text-[#071a3a]">
                    {selectedCustomer.phone ||
                      "Not provided"}
                  </p>
                </div>
              </div>

              {selectedCustomer.address && (
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Address
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {selectedCustomer.address}
                  </p>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-[#071a3a] p-4 text-white">
                  <p className="text-xs text-white/60">
                    Orders
                  </p>

                  <p className="mt-1 text-2xl font-black">
                    {selectedCustomer.orders}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#d4af37] p-4 text-[#071a3a]">
                  <p className="text-xs text-[#071a3a]/60">
                    Total Spent
                  </p>

                  <p className="mt-1 text-xl font-black">
                    {money(
                      selectedCustomer.spent
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-100 p-4 text-[#071a3a]">
                  <p className="text-xs text-slate-400">
                    Joined
                  </p>

                  <p className="mt-1 text-sm font-black">
                    {formatDate(
                      selectedCustomer.createdAt
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}