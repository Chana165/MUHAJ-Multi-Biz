"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  Package,
  Search,
  ShieldCheck,
  Truck,
} from "lucide-react";

type TrackingItem = {
  id: string;
  productName: string;
  productSku: string | null;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
};

type TrackingOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  paymentStatus: string;
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  totalAmount: number;
  shippingAddress: {
    address: string;
    city: string;
    state: string;
    country: string;
  };
  createdAt: string;
  updatedAt: string;
};

type TrackingResponse = {
  ok?: boolean;
  error?: string;
  order?: TrackingOrder;
  items?: TrackingItem[];
};

function formatNaira(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function normalizedStatus(value: string) {
  return value.trim().toLowerCase();
}

function statusRank(status: string) {
  switch (normalizedStatus(status)) {
    case "pending":
      return 1;
    case "confirmed":
      return 2;
    case "processing":
      return 3;
    case "shipped":
      return 4;
    case "delivered":
      return 5;
    default:
      return 0;
  }
}

function PaymentBadge({
  paymentStatus,
}: {
  paymentStatus: string;
}) {
  const paid =
    normalizedStatus(paymentStatus) === "paid";

  const failed =
    normalizedStatus(paymentStatus) === "failed";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
        paid
          ? "bg-emerald-100 text-emerald-700"
          : failed
            ? "bg-red-100 text-red-700"
            : "bg-amber-100 text-amber-700"
      }`}
    >
      {paid
        ? "Paid"
        : failed
          ? "Failed"
          : "Pending"}
    </span>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const current = normalizedStatus(status);

  if (current === "cancelled") {
    return (
      <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
        Cancelled
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize text-slate-700">
      {current}
    </span>
  );
}

function Timeline({
  order,
}: {
  order: TrackingOrder;
}) {
  const current = normalizedStatus(order.status);

  const steps = [
    {
      key: "confirmed",
      title: "Order Confirmed",
      description: "Your order has been confirmed.",
      icon: CheckCircle2,
    },
    {
      key: "processing",
      title: "Processing",
      description: "Your order is being prepared.",
      icon: Package,
    },
    {
      key: "shipped",
      title: "Shipped",
      description: "Your order is on its way.",
      icon: Truck,
    },
    {
      key: "delivered",
      title: "Delivered",
      description: "Your order has been delivered.",
      icon: CheckCircle2,
    },
  ];

  if (current === "cancelled") {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="font-bold text-red-900">
              Order Cancelled
            </p>
            <p className="mt-1 text-sm leading-6 text-red-800">
              This order has been cancelled. Please contact
              MUHAJ Multi Biz if you need assistance.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentRank = statusRank(current);

  return (
    <div className="space-y-0">
      {steps.map((step, index) => {
        const stepRank = statusRank(step.key);
        const complete = currentRank >= stepRank;

        const Icon = step.icon;

        return (
          <div
            key={step.key}
            className="relative flex gap-4"
          >
            {index < steps.length - 1 && (
              <div
                className={`absolute left-[17px] top-9 h-[calc(100%-18px)] w-px ${
                  currentRank > stepRank
                    ? "bg-emerald-300"
                    : "bg-slate-200"
                }`}
              />
            )}

            <div
              className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                complete
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              <Icon className="h-4 w-4" />
            </div>

            <div className="pb-7">
              <p
                className={`text-sm font-bold ${
                  complete
                    ? "text-slate-900"
                    : "text-slate-400"
                }`}
              >
                {step.title}
              </p>

              <p
                className={`mt-1 text-sm ${
                  complete
                    ? "text-slate-600"
                    : "text-slate-400"
                }`}
              >
                {step.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");

  const [order, setOrder] =
    useState<TrackingOrder | null>(null);

  const [items, setItems] =
    useState<TrackingItem[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setOrder(null);
    setItems([]);

    try {
      const response = await fetch(
        "/api/orders/track",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderNumber,
            email,
          }),
        },
      );

      const data =
        (await response.json()) as TrackingResponse;

      if (!response.ok || data.ok !== true || !data.order) {
        throw new Error(
          data.error ||
            "Unable to find this order.",
        );
      }

      setOrder(data.order);
      setItems(data.items ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to find this order.",
      );
    } finally {
      setLoading(false);
    }
  }

  function resetTracking() {
    setOrder(null);
    setItems([]);
    setError("");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to store
        </Link>

        {!order ? (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-slate-900 px-6 py-9 text-white sm:px-10">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                  <Search className="h-6 w-6" />
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-300">
                    MUHAJ Multi Biz
                  </p>

                  <h1 className="mt-1 text-2xl font-bold tracking-tight">
                    Track Your Order
                  </h1>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                    Enter the order number and the email address
                    used during checkout.
                  </p>
                </div>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5 px-6 py-7 sm:px-10"
            >
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                    <p className="text-sm font-medium leading-6 text-red-800">
                      {error}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor="orderNumber"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Order Number
                </label>

                <input
                  id="orderNumber"
                  type="text"
                  value={orderNumber}
                  onChange={(event) =>
                    setOrderNumber(
                      event.target.value.toUpperCase(),
                    )
                  }
                  placeholder="MUHAJ-20261004-00002"
                  required
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-sm font-medium uppercase text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Email Address
                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="Enter the email used for your order"
                  required
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Finding Your Order...
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5" />
                    Track Order
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="h-4 w-4" />
                Your order details are protected.
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="bg-slate-900 px-6 py-8 text-white sm:px-10">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-slate-300">
                      MUHAJ Multi Biz
                    </p>

                    <h1 className="mt-1 text-2xl font-bold tracking-tight">
                      {order.orderNumber}
                    </h1>

                    <p className="mt-2 text-sm text-slate-300">
                      Placed {formatDate(order.createdAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={order.status} />
                    <PaymentBadge
                      paymentStatus={order.paymentStatus}
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-7 sm:px-10">
                <div className="mb-5 flex items-center gap-3">
                  <Clock3 className="h-5 w-5 text-slate-700" />

                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Order Progress
                    </h2>

                    <p className="text-sm text-slate-500">
                      Current status:{" "}
                      <span className="font-semibold capitalize text-slate-700">
                        {order.status}
                      </span>
                    </p>
                  </div>
                </div>

                <Timeline order={order} />
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-6 py-5 sm:px-7">
                  <h2 className="text-lg font-bold text-slate-900">
                    Order Items
                  </h2>
                </div>

                <div className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-4 px-6 py-5 sm:px-7"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">
                          {item.productName}
                        </p>

                        {item.productSku && (
                          <p className="mt-1 text-xs text-slate-500">
                            SKU: {item.productSku}
                          </p>
                        )}

                        <p className="mt-2 text-sm text-slate-500">
                          {formatNaira(item.unitPrice)} ×{" "}
                          {item.quantity}
                        </p>
                      </div>

                      <p className="shrink-0 text-sm font-bold text-slate-900">
                        {formatNaira(item.totalPrice)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-900">
                    Delivery
                  </h2>

                  <div className="mt-4 flex gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-slate-600" />

                    <div className="text-sm leading-6 text-slate-600">
                      {order.shippingAddress.address && (
                        <p>{order.shippingAddress.address}</p>
                      )}

                      <p>
                        {[
                          order.shippingAddress.city,
                          order.shippingAddress.state,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>

                      <p>
                        {order.shippingAddress.country}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-900">
                    Order Summary
                  </h2>

                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex justify-between gap-4 text-slate-600">
                      <span>Subtotal</span>
                      <span>
                        {formatNaira(order.subtotal)}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4 text-slate-600">
                      <span>Delivery</span>
                      <span>
                        {formatNaira(order.shippingFee)}
                      </span>
                    </div>

                    {order.discountAmount > 0 && (
                      <div className="flex justify-between gap-4 text-emerald-700">
                        <span>Discount</span>
                        <span>
                          -{formatNaira(order.discountAmount)}
                        </span>
                      </div>
                    )}

                    <div className="border-t border-slate-200 pt-3">
                      <div className="flex justify-between gap-4 text-base font-extrabold text-slate-900">
                        <span>Total</span>
                        <span>
                          {formatNaira(order.totalAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={resetTracking}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
              >
                <Search className="h-4 w-4" />
                Track Another Order
              </button>

              <Link
                href="/shop"
                className="flex flex-1 items-center justify-center rounded-2xl bg-slate-900 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                Continue Shopping
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-600 shadow-sm">
              Need help with your order? Contact MUHAJ Multi Biz
              through your normal customer support channel.
            </div>
          </div>
        )}
      </div>
    </main>
  );
}