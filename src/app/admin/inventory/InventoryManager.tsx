"use client";

import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Boxes,
  CheckCircle2,
  Clock3,
  Package,
  Plus,
  Search,
  X,
} from "lucide-react";
import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  adjustInventory,
  type InventoryActionResult,
} from "./actions";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  stock: number | null;
  status: string;
  category_id: string | null;
  category_name: string;
  image_url: string | null;
  updated_at: string;
};

type Movement = {
  id: string;
  product_id: string;
  product_name: string;
  quantity_change: number;
  reason: string | null;
  created_at: string;
};

type Props = {
  initialProducts: Product[];
  initialMovements: Movement[];
};

type StockFilter = "all" | "in-stock" | "low-stock" | "out-of-stock";

function getStockState(stock: number) {
  if (stock <= 0) {
    return "out-of-stock";
  }

  if (stock <= 5) {
    return "low-stock";
  }

  return "in-stock";
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function InventoryManager({
  initialProducts,
  initialMovements,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [products, setProducts] = useState<Product[]>(
    initialProducts
  );

  const [movements] = useState<Movement[]>(
    initialMovements
  );

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StockFilter>("all");

  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);

  const [adjustment, setAdjustment] = useState("");
  const [reason, setReason] = useState("");

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const totalUnits = useMemo(
    () =>
      products.reduce(
        (total, product) => total + Math.max(0, Number(product.stock ?? 0)),
        0
      ),
    [products]
  );

  const inStockCount = useMemo(
    () =>
      products.filter(
        (product) => getStockState(Number(product.stock ?? 0)) === "in-stock"
      ).length,
    [products]
  );

  const lowStockCount = useMemo(
    () =>
      products.filter(
        (product) => getStockState(Number(product.stock ?? 0)) === "low-stock"
      ).length,
    [products]
  );

  const outOfStockCount = useMemo(
    () =>
      products.filter(
        (product) =>
          getStockState(Number(product.stock ?? 0)) === "out-of-stock"
      ).length,
    [products]
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const stockState = getStockState(Number(product.stock ?? 0));

      const matchesFilter =
        filter === "all" || stockState === filter;

      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        (product.sku ?? "").toLowerCase().includes(query) ||
        product.category_name.toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [products, search, filter]);

  function openAdjustment(product: Product) {
    setSelectedProduct(product);
    setAdjustment("");
    setReason("Stock adjustment");
    setMessage(null);
  }

  function closeAdjustment() {
    if (isPending) {
      return;
    }

    setSelectedProduct(null);
    setAdjustment("");
    setReason("");
  }

  function handleResult(result: InventoryActionResult) {
    setMessage({
      type: result.ok ? "success" : "error",
      text: result.message,
    });

    if (result.ok) {
      setSelectedProduct(null);
      setAdjustment("");
      setReason("");
      router.refresh();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedProduct) {
      return;
    }

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await adjustInventory(formData);

      if (result.ok) {
        const adjustmentValue = Number(
          formData.get("adjustment") ?? 0
        );

        setProducts((current) =>
          current.map((product) =>
            product.id === selectedProduct.id
              ? {
                  ...product,
                  stock:
                    Number(product.stock ?? 0) + adjustmentValue,
                  updated_at: new Date().toISOString(),
                }
              : product
          )
        );
      }

      handleResult(result);
    });
  }

  return (
    <div className="admin-module-page space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#071a3a] text-[#d4af37]">
              <Boxes className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#b28b16]">
                Catalog operations
              </p>

              <h1 className="text-2xl font-black tracking-tight text-[#071a3a] sm:text-3xl">
                Inventory
              </h1>
            </div>
          </div>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            Monitor product stock, quickly identify low-stock items,
            and record every manual stock adjustment.
          </p>
        </div>
      </div>

      {/* Feedback */}
      {message && (
        <div
          className={`flex items-start gap-3 rounded-2xl border px-4 py-4 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          )}

          <p className="flex-1 font-medium">
            {message.text}
          </p>

          <button
            type="button"
            onClick={() => setMessage(null)}
            className="rounded-lg p-1 transition hover:bg-black/5"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Total Units
              </p>

              <p className="mt-2 text-3xl font-black text-[#071a3a]">
                {totalUnits.toLocaleString()}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#071a3a]/5 text-[#071a3a]">
              <Package className="h-5 w-5" />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setFilter("in-stock")}
          className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:border-emerald-300 ${
            filter === "in-stock"
              ? "border-emerald-300 ring-2 ring-emerald-100"
              : "border-slate-200"
          }`}
        >
          <p className="text-sm font-medium text-slate-500">
            In Stock
          </p>

          <p className="mt-2 text-3xl font-black text-emerald-700">
            {inStockCount}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setFilter("low-stock")}
          className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:border-amber-300 ${
            filter === "low-stock"
              ? "border-amber-300 ring-2 ring-amber-100"
              : "border-slate-200"
          }`}
        >
          <p className="text-sm font-medium text-slate-500">
            Low Stock
          </p>

          <p className="mt-2 text-3xl font-black text-amber-600">
            {lowStockCount}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setFilter("out-of-stock")}
          className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:border-red-300 ${
            filter === "out-of-stock"
              ? "border-red-300 ring-2 ring-red-100"
              : "border-slate-200"
          }`}
        >
          <p className="text-sm font-medium text-slate-500">
            Out of Stock
          </p>

          <p className="mt-2 text-3xl font-black text-red-700">
            {outOfStockCount}
          </p>
        </button>
      </div>

      {/* Inventory List */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-base font-black text-[#071a3a]">
                Product Stock
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {filteredProducts.length} product
                {filteredProducts.length === 1 ? "" : "s"} shown
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search products..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[#d4af37] focus:bg-white focus:ring-2 focus:ring-[#d4af37]/20"
                />
              </div>

              <select
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value as StockFilter)
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-[#d4af37]"
              >
                <option value="all">All Stock</option>
                <option value="in-stock">In Stock</option>
                <option value="low-stock">Low Stock</option>
                <option value="out-of-stock">Out of Stock</option>
              </select>
            </div>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Search className="h-6 w-6" />
            </div>

            <h3 className="mt-4 text-base font-bold text-[#071a3a]">
              No products found
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Try another search or stock filter.
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
                      Product
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                      SKU
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Category
                    </th>

                    <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                      Stock
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredProducts.map((product) => {
                    const stock = Number(product.stock ?? 0);
                    const stockState = getStockState(stock);

                    return (
                      <tr
                        key={product.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#071a3a] text-sm font-black text-[#d4af37]">
                              {product.image_url ? (
                                <img
                                  src={product.image_url}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                product.name.charAt(0).toUpperCase()
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="font-bold text-[#071a3a]">
                                {product.name}
                              </p>

                              <p className="mt-1 max-w-[260px] truncate text-xs text-slate-500">
                                {product.status}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-500">
                          {product.sku || "—"}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-500">
                          {product.category_name || "Uncategorized"}
                        </td>

                        <td className="px-5 py-4 text-center">
                          <span className="text-lg font-black text-[#071a3a]">
                            {stock.toLocaleString()}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${
                              stockState === "in-stock"
                                ? "bg-emerald-50 text-emerald-700"
                                : stockState === "low-stock"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-red-50 text-red-700"
                            }`}
                          >
                            {stockState === "in-stock"
                              ? "In Stock"
                              : stockState === "low-stock"
                                ? "Low Stock"
                                : "Out of Stock"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => openAdjustment(product)}
                            disabled={isPending}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#071a3a] px-3.5 py-2.5 text-xs font-bold text-[#d4af37] transition hover:bg-[#102b58] disabled:opacity-60"
                          >
                            <Plus className="h-4 w-4" />
                            Adjust Stock
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile/tablet */}
            <div className="divide-y divide-slate-100 lg:hidden">
              {filteredProducts.map((product) => {
                const stock = Number(product.stock ?? 0);
                const stockState = getStockState(stock);

                return (
                  <article key={product.id} className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#071a3a] text-sm font-black text-[#d4af37]">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          product.name.charAt(0).toUpperCase()
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-[#071a3a]">
                            {product.name}
                          </h3>

                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                              stockState === "in-stock"
                                ? "bg-emerald-50 text-emerald-700"
                                : stockState === "low-stock"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-red-50 text-red-700"
                            }`}
                          >
                            {stockState === "in-stock"
                              ? "In Stock"
                              : stockState === "low-stock"
                                ? "Low Stock"
                                : "Out of Stock"}
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-slate-400">
                          SKU: {product.sku || "—"}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {product.category_name || "Uncategorized"}
                        </p>

                        <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 p-3">
                          <span className="text-xs font-semibold text-slate-500">
                            Current Stock
                          </span>

                          <span className="text-xl font-black text-[#071a3a]">
                            {stock.toLocaleString()}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => openAdjustment(product)}
                          disabled={isPending}
                          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#071a3a] px-4 py-3 text-xs font-bold text-[#d4af37] disabled:opacity-60"
                        >
                          <Plus className="h-4 w-4" />
                          Adjust Stock
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Movement History */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Clock3 className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-base font-black text-[#071a3a]">
                Recent Inventory Activity
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Latest recorded stock movements
              </p>
            </div>
          </div>
        </div>

        {movements.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            No inventory movements have been recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {movements.slice(0, 20).map((movement) => {
              const increase = movement.quantity_change > 0;

              return (
                <div
                  key={movement.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        increase
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {increase ? (
                        <ArrowUp className="h-4 w-4" />
                      ) : (
                        <ArrowDown className="h-4 w-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="font-bold text-[#071a3a]">
                        {movement.product_name}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {movement.reason || "Stock adjustment"}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {formatDate(movement.created_at)}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-lg font-black ${
                      increase
                        ? "text-emerald-700"
                        : "text-red-700"
                    }`}
                  >
                    {increase ? "+" : ""}
                    {movement.quantity_change.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Adjustment Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#071a3a]/50 p-0 backdrop-blur-sm sm:items-center sm:p-5">
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b28b16]">
                  Inventory
                </p>

                <h2 className="mt-1 text-xl font-black text-[#071a3a]">
                  Adjust Stock
                </h2>
              </div>

              <button
                type="button"
                onClick={closeAdjustment}
                disabled={isPending}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-5 sm:p-6"
            >
              <input
                type="hidden"
                name="product_id"
                value={selectedProduct.id}
              />

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Product
                </p>

                <p className="mt-1 text-base font-black text-[#071a3a]">
                  {selectedProduct.name}
                </p>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    Current Stock
                  </span>

                  <span className="text-2xl font-black text-[#071a3a]">
                    {Number(
                      selectedProduct.stock ?? 0
                    ).toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="inventory-adjustment"
                  className="mb-2 block text-sm font-bold text-[#071a3a]"
                >
                  Stock Adjustment
                </label>

                <input
                  id="inventory-adjustment"
                  name="adjustment"
                  type="number"
                  step="1"
                  required
                  value={adjustment}
                  onChange={(event) =>
                    setAdjustment(event.target.value)
                  }
                  placeholder="+10 or -2"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-lg font-bold text-[#071a3a] outline-none transition focus:border-[#d4af37] focus:bg-white focus:ring-2 focus:ring-[#d4af37]/20"
                />

                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Use a positive number to add stock and a negative
                  number to remove stock.
                </p>
              </div>

              <div>
                <label
                  htmlFor="inventory-reason"
                  className="mb-2 block text-sm font-bold text-[#071a3a]"
                >
                  Reason
                </label>

                <input
                  id="inventory-reason"
                  name="reason"
                  type="text"
                  required
                  maxLength={200}
                  value={reason}
                  onChange={(event) =>
                    setReason(event.target.value)
                  }
                  placeholder="e.g. New supplier delivery"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#d4af37] focus:bg-white focus:ring-2 focus:ring-[#d4af37]/20"
                />
              </div>

              {message?.type === "error" && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {message.text}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeAdjustment}
                  disabled={isPending}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-[#071a3a] px-5 py-3 text-sm font-bold text-[#d4af37] transition hover:bg-[#102b58] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending
                    ? "Updating..."
                    : "Update Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}