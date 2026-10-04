"use client";

import { useState } from "react";

type CartProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image_url: string | null;
};

type AddToCartButtonProps = {
  product: CartProduct;
  maxStock: number;
};

function getCart() {
  try {
    const raw = localStorage.getItem("muhaj-cart");
    if (!raw) return [];

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function AddToCartButton({
  product,
  maxStock,
}: AddToCartButtonProps) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const increase = () => {
    setQuantity((current) => Math.min(current + 1, maxStock));
  };

  const decrease = () => {
    setQuantity((current) => Math.max(current - 1, 1));
  };

  const addToCart = () => {
    const cart = getCart();

    const existingIndex = cart.findIndex(
      (item: { id?: string }) => item.id === product.id
    );

    if (existingIndex >= 0) {
      const existing = cart[existingIndex];

      cart[existingIndex] = {
        ...existing,
        quantity: Math.min(
          Number(existing.quantity || 0) + quantity,
          maxStock
        ),
      };
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        image_url: product.image_url,
        quantity,
      });
    }

    localStorage.setItem("muhaj-cart", JSON.stringify(cart));

    window.dispatchEvent(new Event("muhaj-cart-updated"));

    setAdded(true);

    window.setTimeout(() => {
      setAdded(false);
    }, 1800);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex h-12 items-center rounded-xl border border-slate-200 bg-white">
          <button
            type="button"
            onClick={decrease}
            disabled={quantity <= 1}
            className="flex h-full w-12 items-center justify-center text-xl font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Decrease quantity"
          >
            −
          </button>

          <div className="flex h-full min-w-12 items-center justify-center border-x border-slate-200 px-3 text-sm font-extrabold text-[#061a3a]">
            {quantity}
          </div>

          <button
            type="button"
            onClick={increase}
            disabled={quantity >= maxStock}
            className="flex h-full w-12 items-center justify-center text-xl font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={addToCart}
          className="flex-1 rounded-xl bg-[#061a3a] px-6 py-3.5 text-sm font-extrabold text-white transition hover:bg-[#0a2858]"
        >
          {added ? "Added to Cart ✓" : "Add to Cart"}
        </button>
      </div>

      {added && (
        <p className="text-sm font-semibold text-emerald-600">
          {quantity} {quantity === 1 ? "item has" : "items have"} been added
          to your cart.
        </p>
      )}
    </div>
  );
}