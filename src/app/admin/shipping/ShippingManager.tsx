"use client";

import {
  useMemo,
  useState,
  useTransition,
  type FormEvent,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  MapPin,
  Package,
  Plus,
  Save,
  Trash2,
  Truck,
  X,
  XCircle,
} from "lucide-react";

import {
  createShippingMethod,
  deleteShippingMethod,
  updateShippingMethod,
  type ShippingMethod,
} from "./actions";

type Props = {
  initialMethods: ShippingMethod[];
  loadError?: string;
};

type Form = {
  name: string;
  description: string;
  zone: string;
  fee: number;
  freeShippingThreshold: number | null;
  estimatedDays: string;
  isActive: boolean;
  sortOrder: number;
};

const emptyForm: Form = {
  name: "",
  description: "",
  zone: "Nationwide Nigeria",
  fee: 0,
  freeShippingThreshold: null,
  estimatedDays: "3–7 business days",
  isActive: true,
  sortOrder: 0,
};

function money(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function toForm(item: ShippingMethod): Form {
  return {
    name: item.name,
    description: item.description,
    zone: item.zone,
    fee: item.fee,
    freeShippingThreshold:
      item.freeShippingThreshold,
    estimatedDays: item.estimatedDays,
    isActive: item.isActive,
    sortOrder: item.sortOrder,
  };
}

export default function ShippingManager({
  initialMethods,
  loadError,
}: Props) {
  const [methods, setMethods] =
    useState(initialMethods);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] =
    useState<ShippingMethod | null>(null);

  const [form, setForm] =
    useState<Form>(emptyForm);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] =
    useTransition();

  const activeCount = useMemo(
    () =>
      methods.filter((item) => item.isActive)
        .length,
    [methods]
  );

  const cheapestFee = useMemo(() => {
    if (methods.length === 0) return 0;

    return Math.min(
      ...methods.map((item) => item.fee)
    );
  }, [methods]);

  function createNew() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setMessage("");
    setOpen(true);
  }

  function edit(item: ShippingMethod) {
    setEditing(item);
    setForm(toForm(item));
    setError("");
    setMessage("");
    setOpen(true);
  }

  function close() {
    if (pending) return;

    setOpen(false);
    setEditing(null);
    setForm(emptyForm);
  }

  function save(event: FormEvent) {
    event.preventDefault();

    setError("");
    setMessage("");

    startTransition(async () => {
      const result = editing
        ? await updateShippingMethod(
            editing.id,
            form
          )
        : await createShippingMethod(form);

      if (!result.success) {
        setError(
          result.error ??
            "Unable to save shipping method."
        );
        return;
      }

      if (editing && result.method) {
        setMethods((items) =>
          items
            .map((item) =>
              item.id === editing.id
                ? result.method!
                : item
            )
            .sort(
              (a, b) =>
                a.sortOrder -
                b.sortOrder
            )
        );

        setMessage(
          "Shipping method updated successfully."
        );
      } else if (result.method) {
        setMethods((items) =>
          [...items, result.method!].sort(
            (a, b) =>
              a.sortOrder -
              b.sortOrder
          )
        );

        setMessage(
          "Shipping method created successfully."
        );
      }

      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
    });
  }

  function remove(item: ShippingMethod) {
    const confirmed = window.confirm(
      `Delete "${item.name}"?`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    startTransition(async () => {
      const result =
        await deleteShippingMethod(item.id);

      if (!result.success) {
        setError(
          result.error ??
            "Unable to delete shipping method."
        );
        return;
      }

      setMethods((items) =>
        items.filter(
          (method) =>
            method.id !== item.id
        )
      );

      setMessage(
        "Shipping method deleted successfully."
      );
    });
  }

  return (
    <div className="admin-module-page space-y-6">
      <div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          Shipping Management
        </h1>
      </div>

      {(loadError || error || message) ? (
        <div
          className={`flex gap-3 rounded-2xl border p-4 text-sm ${
            loadError || error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {loadError || error ? (
            <AlertCircle className="h-5 w-5 shrink-0" />
          ) : (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          )}

          <div>
            <p className="font-semibold">
              {loadError || error
                ? "Shipping notice"
                : "Shipping update"}
            </p>

            <p className="mt-1">
              {loadError || error || message}
            </p>
          </div>

          {!pending ? (
            <button
              type="button"
              onClick={() => {
                setError("");
                setMessage("");
              }}
              className="ml-auto text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Shipping Methods
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-950">
                {methods.length}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#061a3a] text-amber-300">
              <Truck className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Active Methods
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-950">
                {activeCount}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#061a3a] text-amber-300">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Lowest Delivery Fee
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-950">
                {methods.length
                  ? money(cheapestFee)
                  : "—"}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#061a3a] text-amber-300">
              <Package className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Delivery Methods
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Configure the delivery options customers will
                see during checkout.
              </p>
            </div>

            <button
              type="button"
              onClick={createNew}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#061a3a] px-4 text-sm font-semibold text-white hover:bg-[#0a2857]"
            >
              <Plus className="h-4 w-4" />
              Add Shipping Method
            </button>
          </div>
        </div>

        {methods.length === 0 ? (
          <div className="px-5 py-16 text-center sm:px-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <Truck className="h-6 w-6" />
            </div>

            <h3 className="mt-4 font-bold text-slate-950">
              No shipping methods yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Add a delivery method so customers can choose
              how their orders should be delivered.
            </p>

            <button
              type="button"
              onClick={createNew}
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-[#061a3a] px-4 text-sm font-semibold text-white hover:bg-[#0a2857]"
            >
              <Plus className="h-4 w-4" />
              Add First Method
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {methods.map((item) => (
              <div
                key={item.id}
                className="p-5 sm:p-6"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <Truck className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-950">
                        {item.name}
                      </h3>

                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          item.isActive
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-100 text-slate-600"
                        }`}
                      >
                        {item.isActive ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" />
                        )}

                        {item.isActive
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      {item.description ||
                        "No description provided."}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                      <span className="inline-flex items-center gap-2 text-slate-600">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        {item.zone}
                      </span>

                      <span className="font-semibold text-slate-900">
                        {item.fee === 0
                          ? "Free"
                          : money(item.fee)}
                      </span>

                      {item.freeShippingThreshold !== null ? (
                        <span className="text-slate-500">
                          Free from{" "}
                          <strong className="text-slate-700">
                            {money(
                              item.freeShippingThreshold
                            )}
                          </strong>
                        </span>
                      ) : null}

                      {item.estimatedDays ? (
                        <span className="text-slate-500">
                          {item.estimatedDays}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2 lg:justify-end">
                    <button
                      type="button"
                      onClick={() => edit(item)}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Edit3 className="h-4 w-4" />
                      Edit
                    </button>

                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => remove(item)}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-200 px-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <MapPin className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-bold text-slate-950">
              Store Delivery
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              MUHAJ Multi Biz can use nationwide delivery as the
              default shipping zone. More specific delivery methods
              can be added later without changing the order system.
            </p>
          </div>
        </div>
      </section>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5 sm:px-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-700">
                  {editing
                    ? "Edit Shipping Method"
                    : "New Shipping Method"}
                </p>

                <h3 className="mt-1 text-xl font-bold text-slate-950">
                  {editing
                    ? "Update Delivery Method"
                    : "Add Delivery Method"}
                </h3>
              </div>

              <button
                type="button"
                onClick={close}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={save}
              className="space-y-5 px-5 py-6 sm:px-6"
            >
              <div>
                <label className="text-sm font-semibold text-slate-800">
                  Shipping Method Name
                </label>

                <input
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                    })
                  }
                  placeholder="e.g. Nationwide Delivery"
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#061a3a] focus:ring-2 focus:ring-[#061a3a]/10"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-800">
                  Description
                </label>

                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      description: e.target.value,
                    })
                  }
                  placeholder="Describe this delivery option."
                  className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#061a3a] focus:ring-2 focus:ring-[#061a3a]/10"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-800">
                  Delivery Zone
                </label>

                <input
                  value={form.zone}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      zone: e.target.value,
                    })
                  }
                  placeholder="Nationwide Nigeria"
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#061a3a] focus:ring-2 focus:ring-[#061a3a]/10"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-slate-800">
                    Delivery Fee
                  </label>

                  <div className="relative mt-2">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                      ₦
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.fee}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          fee:
                            Number(e.target.value) ||
                            0,
                        })
                      }
                      className="h-11 w-full rounded-xl border border-slate-200 pl-8 pr-3 text-sm outline-none focus:border-[#061a3a] focus:ring-2 focus:ring-[#061a3a]/10"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-800">
                    Free Shipping From
                  </label>

                  <div className="relative mt-2">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                      ₦
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        form.freeShippingThreshold ??
                        ""
                      }
                      onChange={(e) => {
                        const raw =
                          e.target.value;

                        setForm({
                          ...form,
                          freeShippingThreshold:
                            raw === ""
                              ? null
                              : Number(raw) || 0,
                        });
                      }}
                      placeholder="Optional"
                      className="h-11 w-full rounded-xl border border-slate-200 pl-8 pr-3 text-sm outline-none focus:border-[#061a3a] focus:ring-2 focus:ring-[#061a3a]/10"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-slate-800">
                    Estimated Delivery
                  </label>

                  <input
                    value={form.estimatedDays}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        estimatedDays:
                          e.target.value,
                      })
                    }
                    placeholder="3–7 business days"
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#061a3a] focus:ring-2 focus:ring-[#061a3a]/10"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-800">
                    Display Order
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={form.sortOrder}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        sortOrder:
                          Number(e.target.value) ||
                          0,
                      })
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#061a3a] focus:ring-2 focus:ring-[#061a3a]/10"
                  />
                </div>
              </div>

              <label className="flex h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-4">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      isActive:
                        e.target.checked,
                    })
                  }
                  className="h-4 w-4 accent-[#061a3a]"
                />

                <span className="text-sm font-semibold text-slate-700">
                  Shipping method is active
                </span>
              </label>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={close}
                  disabled={pending}
                  className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#061a3a] px-5 text-sm font-semibold text-white hover:bg-[#0a2857] disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />

                  {pending
                    ? "Saving..."
                    : editing
                      ? "Update Method"
                      : "Create Method"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}