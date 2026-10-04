"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
  ShieldCheck,
  ShoppingBag,
  AlertCircle,
} from "lucide-react";

type PaymentResponse = {
  ok?: boolean;
  mode?: string;
  orderId?: string;
  orderNumber?: string;
  customerName?: string;
  amountNaira?: number;
  amountKobo?: number;
  reference?: string;
  authorizationUrl?: string;
  accessCode?: string | null;
  message?: string;
  error?: string;
};

function formatNaira(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function PaymentPageContent() {
  const searchParams = useSearchParams();

  const orderId = searchParams.get("order");
  const returned = searchParams.get("returned") === "1";
  const returnedReference = searchParams.get("reference");

  const [payment, setPayment] = useState<PaymentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [error, setError] = useState("");

  const loadOrder = useCallback(async () => {
    if (!orderId) {
      setError("No order was supplied for payment.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/paystack/initialize-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId }),
      });

      const data = (await response.json()) as PaymentResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to prepare this payment.");
      }

      setPayment(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to prepare this payment.",
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (!returned) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadOrder();
    }
  }, [loadOrder, returned]);

  async function handlePay() {
    if (!orderId) {
      setError("No order was supplied for payment.");
      return;
    }

    setInitializing(true);
    setError("");

    try {
      const response = await fetch("/api/paystack/initialize-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId }),
      });

      const data = (await response.json()) as PaymentResponse;

      if (!response.ok || !data.ok || !data.authorizationUrl) {
        throw new Error(data.error || "Unable to start Paystack checkout.");
      }

      sessionStorage.setItem(
        "muhaj-paystack-session",
        JSON.stringify({
          orderId: data.orderId,
          orderNumber: data.orderNumber,
          reference: data.reference,
          amountNaira: data.amountNaira,
        }),
      );

      window.location.href = data.authorizationUrl;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to start Paystack checkout.",
      );
      setInitializing(false);
    }
  }

  if (returned) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-8 text-center sm:px-10">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
                <CheckCircle2 className="h-8 w-8 text-amber-600" />
              </div>

              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                MUHAJ Multi Biz
              </p>

              <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
                Payment Returned
              </h1>

              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">
                Paystack has returned you to MUHAJ Multi Biz. Your transaction
                must be verified by our server before the order is marked as
                paid.
              </p>
            </div>

            <div className="space-y-4 px-6 py-7 sm:px-10">
              {orderId && (
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Order
                  </p>
                  <p className="mt-1 break-all text-sm font-semibold text-slate-900">
                    {orderId}
                  </p>
                </div>
              )}

              {returnedReference && (
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Paystack Reference
                  </p>
                  <p className="mt-1 break-all text-sm font-semibold text-slate-900">
                    {returnedReference}
                  </p>
                </div>
              )}

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Please do not create another order while payment verification
                is being completed.
              </div>

              <Link
                href={`/checkout/payment?order=${encodeURIComponent(orderId ?? "")}`}
                className="flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Return to Payment Page
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/checkout/review"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to order review
        </Link>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-900 px-6 py-8 text-white sm:px-10">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                <CreditCard className="h-6 w-6" />
              </div>

              <div>
                <p className="text-sm font-medium text-slate-300">
                  MUHAJ Multi Biz
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight">
                  Secure Payment
                </h1>
                <p className="mt-2 text-sm text-slate-300">
                  Complete your order securely with Paystack.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 px-6 py-7 sm:px-10">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-900" />
                  <p className="mt-3 text-sm text-slate-600">
                    Preparing your order...
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                <div className="flex gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                  <div>
                    <p className="font-semibold text-red-900">
                      Payment could not be prepared
                    </p>
                    <p className="mt-1 text-sm leading-6 text-red-800">
                      {error}
                    </p>
                    <button
                      type="button"
                      onClick={() => void loadOrder()}
                      className="mt-4 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            ) : payment ? (
              <>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="h-5 w-5 text-slate-700" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Order Number
                      </p>
                      <p className="mt-0.5 text-base font-bold text-slate-900">
                        {payment.orderNumber}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 p-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-500">
                      Amount to Pay
                    </p>

                    <p className="mt-2 text-4xl font-extrabold tracking-tight text-slate-900">
                      {formatNaira(Number(payment.amountNaira ?? 0))}
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      Customer: {payment.customerName}
                    </p>
                  </div>

                  <div className="mt-6 space-y-3">
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Order amount verified on the server
                    </div>

                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Paystack Test Mode
                    </div>

                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      Payment verification will be required before delivery
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handlePay}
                  disabled={initializing}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {initializing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Connecting to Paystack...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5" />
                      Continue to Paystack
                    </>
                  )}
                </button>

                <p className="text-center text-xs leading-5 text-slate-500">
                  You will be redirected to Paystack to complete payment.
                </p>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50">
          <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
        </main>
      }
    >
      <PaymentPageContent />
    </Suspense>
  );
}