"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CheckoutData,
  clearCheckoutData,
  readCheckoutData,
} from "@/lib/store/checkout-storage";

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function OrderReviewClient() {
  const [checkout, setCheckout] = useState<CheckoutData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCheckout(readCheckoutData());
    setLoaded(true);
  }, []);

  const subtotal = useMemo(() => {
    if (!checkout) {
      return 0;
    }

    return checkout.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  }, [checkout]);

  const shippingFee = checkout?.shipping_fee ?? 0;
  const total = subtotal + shippingFee;

  const submitOrder = async () => {
    if (!checkout || submitting) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer: checkout.customer,
          shipping_method_id: checkout.shipping_method_id,
          items: checkout.items.map((item) => ({
            id: item.id,
            quantity: item.quantity,
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result?.success || !result?.order) {
        throw new Error(
          result?.error ||
            "We could not create your order. Please try again."
        );
      }

      /*
       * Save the newly-created order temporarily so the payment
       * page can use it in the next step.
       */
      sessionStorage.setItem(
        "muhaj-created-order",
        JSON.stringify(result.order)
      );

      /*
       * Clear the old checkout session and shopping cart only after
       * the database confirms that the order was created.
       */
      clearCheckoutData();

      localStorage.removeItem("muhaj-cart");

      window.dispatchEvent(new Event("muhaj-cart-updated"));

      /*
       * Payment page will be connected to Paystack in the next step.
       */
      window.location.href =
        `/checkout/payment?order=${encodeURIComponent(
          result.order.order_number
        )}`;
    } catch (submitError) {
      setSubmitting(false);

      setError(
        submitError instanceof Error
          ? submitError.message
          : "We could not create your order. Please try again."
      );
    }
  };

  if (!loaded) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto h-8 w-8 animate-pulse rounded-full bg-slate-200" />

        <p className="mt-4 text-sm text-slate-500">
          Loading your order review...
        </p>
      </div>
    );
  }

  if (!checkout) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 text-4xl font-black text-slate-300">
          M
        </div>

        <h2 className="mt-6 text-2xl font-black text-[#061a3a]">
          Checkout information not found
        </h2>

        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
          We could not recover your checkout details. Please return to
          checkout and enter your information again.
        </p>

        <Link
          href="/checkout"
          className="mt-7 inline-flex rounded-xl bg-[#061a3a] px-6 py-3.5 text-sm font-extrabold text-white transition hover:bg-[#0a2858]"
        >
          Return to Checkout
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        {/* Customer */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b78927]">
                CUSTOMER
              </p>

              <h2 className="mt-1 text-xl font-black text-[#061a3a]">
                Customer Information
              </h2>
            </div>

            <Link
              href="/checkout"
              className="text-sm font-bold text-[#061a3a] transition hover:text-[#b78927]"
            >
              Edit
            </Link>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Full Name
              </p>

              <p className="mt-1 break-words text-sm font-bold text-slate-800">
                {checkout.customer.full_name}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Phone
              </p>

              <p className="mt-1 break-words text-sm font-bold text-slate-800">
                {checkout.customer.phone}
              </p>
            </div>

            <div className="sm:col-span-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Email
              </p>

              <p className="mt-1 break-words text-sm font-bold text-slate-800">
                {checkout.customer.email}
              </p>
            </div>
          </div>
        </section>

        {/* Delivery */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b78927]">
                DELIVERY
              </p>

              <h2 className="mt-1 text-xl font-black text-[#061a3a]">
                Delivery Information
              </h2>
            </div>

            <Link
              href="/checkout"
              className="text-sm font-bold text-[#061a3a] transition hover:text-[#b78927]"
            >
              Edit
            </Link>
          </div>

          <div className="mt-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Delivery Address
            </p>

            <p className="mt-1 text-sm font-bold leading-6 text-slate-800">
              {checkout.customer.address}
              <br />
              {checkout.customer.city}, {checkout.customer.state}
              <br />
              Nigeria
            </p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Delivery Method
              </p>

              <p className="mt-1 text-sm font-bold text-slate-800">
                {checkout.shipping_method_name}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Delivery Fee
              </p>

              <p className="mt-1 text-sm font-bold text-slate-800">
                {shippingFee === 0
                  ? "Free"
                  : formatPrice(shippingFee)}
              </p>
            </div>
          </div>

          {checkout.customer.notes && (
            <div className="mt-5 rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Order Notes
              </p>

              <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">
                {checkout.customer.notes}
              </p>
            </div>
          )}
        </section>

        {/* Products */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b78927]">
              ORDER
            </p>

            <h2 className="mt-1 text-xl font-black text-[#061a3a]">
              Products
            </h2>
          </div>

          <div className="mt-5 divide-y divide-slate-200">
            {checkout.items.map((item) => (
              <div
                key={item.id}
                className="flex gap-4 py-4 first:pt-0 last:pb-0"
              >
                <Link
                  href={`/products/${item.slug}`}
                  className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100"
                >
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-2xl font-black text-slate-300">
                      M
                    </div>
                  )}
                </Link>

                <div className="min-w-0 flex-1">
                  <Link href={`/products/${item.slug}`}>
                    <h3 className="line-clamp-2 text-sm font-extrabold text-[#061a3a] transition hover:text-[#b78927]">
                      {item.name}
                    </h3>
                  </Link>

                  <p className="mt-1 text-xs text-slate-500">
                    Quantity: {item.quantity}
                  </p>

                  <p className="mt-2 text-sm font-bold text-slate-700">
                    {formatPrice(item.price)} each
                  </p>
                </div>

                <div className="shrink-0 text-right text-sm font-black text-[#061a3a]">
                  {formatPrice(item.price * item.quantity)}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Final action */}
        <section className="rounded-2xl bg-[#061a3a] p-6 text-white shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#d5ad58]">
            ORDER READY
          </p>

          <h2 className="mt-2 text-xl font-black">
            Everything looks correct?
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">
            Submit your order to MUHAJ Multi Biz. Your order will be created
            securely and a pending payment record will be prepared.
          </p>

          {error && (
            <div className="mt-5 rounded-xl border border-red-300/30 bg-red-500/10 p-4 text-sm font-semibold leading-6 text-red-100">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={submitOrder}
            disabled={submitting}
            className="mt-5 w-full rounded-xl bg-white px-5 py-3.5 text-sm font-extrabold text-[#061a3a] transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {submitting
              ? "Creating Your Order..."
              : "Place Order & Continue"}
          </button>
        </section>
      </div>

      {/* Summary */}
      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-28">
        <h2 className="text-lg font-black text-[#061a3a]">
          Order Summary
        </h2>

        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-slate-500">Items</span>

            <span className="font-bold text-slate-900">
              {checkout.items.reduce(
                (sum, item) => sum + item.quantity,
                0
              )}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-slate-500">Subtotal</span>

            <span className="font-bold text-slate-900">
              {formatPrice(subtotal)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-slate-500">Delivery</span>

            <span className="font-bold text-slate-900">
              {shippingFee === 0
                ? "Free"
                : formatPrice(shippingFee)}
            </span>
          </div>
        </div>

        <div className="mt-5 flex items-end justify-between gap-4 border-t border-slate-200 pt-5">
          <span className="text-base font-bold text-slate-600">
            Total
          </span>

          <span className="text-2xl font-black text-[#061a3a]">
            {formatPrice(total)}
          </span>
        </div>
      </aside>
    </div>
  );
}