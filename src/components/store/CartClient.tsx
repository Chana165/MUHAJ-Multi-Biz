"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type CartItem = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image_url: string | null;
  quantity: number;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function readCart(): CartItem[] {
  try {
    const raw = localStorage.getItem("muhaj-cart");

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (item) =>
          item &&
          typeof item.id === "string" &&
          typeof item.name === "string" &&
          typeof item.slug === "string" &&
          typeof item.price === "number" &&
          typeof item.quantity === "number"
      )
      .map((item) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        price: item.price,
        image_url:
          typeof item.image_url === "string" ? item.image_url : null,
        quantity: Math.max(1, Math.floor(item.quantity)),
      }));
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  localStorage.setItem("muhaj-cart", JSON.stringify(items));
  window.dispatchEvent(new Event("muhaj-cart-updated"));
}

export default function CartClient() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadCart = () => {
      setItems(readCart());
      setLoaded(true);
    };

    loadCart();

    window.addEventListener("storage", loadCart);
    window.addEventListener("muhaj-cart-updated", loadCart);

    return () => {
      window.removeEventListener("storage", loadCart);
      window.removeEventListener("muhaj-cart-updated", loadCart);
    };
  }, []);

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) {
      return;
    }

    const updated = items.map((item) =>
      item.id === id ? { ...item, quantity } : item
    );

    setItems(updated);
    saveCart(updated);
  };

  const removeItem = (id: string) => {
    const updated = items.filter((item) => item.id !== id);

    setItems(updated);
    saveCart(updated);
  };

  const clearCart = () => {
    setItems([]);
    localStorage.removeItem("muhaj-cart");
    window.dispatchEvent(new Event("muhaj-cart-updated"));
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  if (!loaded) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto h-8 w-8 animate-pulse rounded-full bg-slate-200" />
        <p className="mt-4 text-sm text-slate-500">Loading your cart...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 text-4xl font-black text-slate-300">
          M
        </div>

        <h2 className="mt-6 text-2xl font-black text-[#061a3a]">
          Your cart is empty
        </h2>

        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
          You have not added any products yet. Explore the MUHAJ collection
          and add something you like to your cart.
        </p>

        <Link
          href="/shop"
          className="mt-7 inline-flex rounded-xl bg-[#061a3a] px-6 py-3.5 text-sm font-extrabold text-white transition hover:bg-[#0a2858]"
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
      {/* Cart items */}
      <div>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-[#061a3a]">
              Your Cart
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {totalItems} {totalItems === 1 ? "item" : "items"} in your cart
            </p>
          </div>

          <button
            type="button"
            onClick={clearCart}
            className="text-left text-sm font-bold text-red-500 transition hover:text-red-700 sm:text-right"
          >
            Clear Cart
          </button>
        </div>

        <div className="space-y-4">
          {items.map((item) => {
            const itemTotal = item.price * item.quantity;

            return (
              <article
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
              >
                <div className="flex gap-4">
                  <Link
                    href={`/products/${item.slug}`}
                    className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-28 sm:w-28"
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-3xl font-black text-slate-300">
                        M
                      </div>
                    )}
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <Link href={`/products/${item.slug}`}>
                          <h3 className="line-clamp-2 text-base font-extrabold text-[#061a3a] transition hover:text-[#b78927] sm:text-lg">
                            {item.name}
                          </h3>
                        </Link>

                        <p className="mt-1 text-sm font-semibold text-slate-500">
                          {formatPrice(item.price)} each
                        </p>
                      </div>

                      <div className="shrink-0 text-base font-black text-[#061a3a]">
                        {formatPrice(itemTotal)}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-white">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                          disabled={item.quantity <= 1}
                          className="flex h-full w-10 items-center justify-center text-lg font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`Decrease quantity of ${item.name}`}
                        >
                          −
                        </button>

                        <div className="flex h-full min-w-11 items-center justify-center border-x border-slate-200 px-3 text-sm font-extrabold text-[#061a3a]">
                          {item.quantity}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                          className="flex h-full w-10 items-center justify-center text-lg font-bold text-slate-600 transition hover:bg-slate-50"
                          aria-label={`Increase quantity of ${item.name}`}
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-sm font-bold text-red-500 transition hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-6">
          <Link
            href="/shop"
            className="text-sm font-bold text-[#061a3a] transition hover:text-[#b78927]"
          >
            ← Continue Shopping
          </Link>
        </div>
      </div>

      {/* Summary */}
      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-28">
        <h2 className="text-lg font-black text-[#061a3a]">
          Order Summary
        </h2>

        <div className="mt-5 space-y-3 border-b border-slate-200 pb-5">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-slate-500">Items</span>
            <span className="font-bold text-slate-900">{totalItems}</span>
          </div>

          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-bold text-slate-900">
              {formatPrice(subtotal)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-slate-500">Delivery</span>
            <span className="font-semibold text-slate-400">
              Calculated at checkout
            </span>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-4">
          <span className="text-base font-bold text-slate-600">
            Estimated Total
          </span>

          <span className="text-xl font-black text-[#061a3a]">
            {formatPrice(subtotal)}
          </span>
        </div>

        <Link
          href="/checkout"
          className="mt-6 flex w-full items-center justify-center rounded-xl bg-[#061a3a] px-5 py-3.5 text-sm font-extrabold text-white transition hover:bg-[#0a2858]"
        >
          Proceed to Checkout
        </Link>

        <a
          href="https://wa.me/07033672170"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex w-full items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 text-sm font-extrabold text-emerald-700 transition hover:bg-emerald-100"
        >
          Order on WhatsApp
        </a>

        <div className="mt-6 rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
            Delivery
          </p>

          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
            Nationwide delivery is available across Nigeria.
          </p>
        </div>
      </aside>
    </div>
  );
}