"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Loader2,
  ShoppingBag,
} from "lucide-react";

type VerificationResult = {
  ok?: boolean;
  paid?: boolean;
  alreadyProcessed?: boolean;
  orderNumber?: string | null;
  paymentStatus?: string;
  orderStatus?: string;
  reference?: string;
  paystackStatus?: string;
  amountNaira?: number;
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

function CallbackContent() {
  const searchParams = useSearchParams();

  const reference =
    searchParams.get("reference") ??
    searchParams.get("trxref");

  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function verifyPayment() {
      if (!reference) {
        setError("No Paystack transaction reference was returned.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/paystack/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reference }),
        });

        const data =
          (await response.json()) as VerificationResult;

        if (!response.ok || data.ok !== true) {
          throw new Error(
            data.error ||
              "The payment could not be verified.",
          );
        }

        setResult(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "The payment could not be verified.",
        );
      } finally {
        setLoading(false);
      }
    }

    void verifyPayment();
  }, [reference]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <Loader2 className="mx-auto h-9 w-9 animate-spin text-slate-900" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Verifying your payment
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Please wait while MUHAJ confirms your Paystack transaction.
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <div className="overflow-hidden rounded-3xl border border-red-200 bg-white shadow-sm">
            <div className="border-b border-red-100 bg-red-50 px-6 py-8 text-center sm:px-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>

              <h1 className="mt-4 text-2xl font-bold text-red-950">
                Payment Verification Issue
              </h1>

              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-red-800">
                {error}
              </p>
            </div>

            <div className="px-6 py-7 sm:px-10">
              <Link
                href="/shop"
                className="flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3.5 text-sm font-bold text-white hover:bg-slate-800"
              >
                Return to Store
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const paid = result?.paid === true;

  if (paid) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <div className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-sm">
            <div className="border-b border-emerald-100 bg-emerald-50 px-6 py-8 text-center sm:px-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white">
                <CheckCircle2 className="h-9 w-9 text-emerald-600" />
              </div>

              <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
                MUHAJ Multi Biz
              </p>

              <h1 className="mt-2 text-2xl font-bold text-emerald-950">
                Payment Successful
              </h1>

              <p className="mt-3 text-sm leading-6 text-emerald-800">
                Your payment has been verified successfully and your order
                has been confirmed.
              </p>
            </div>

            <div className="space-y-4 px-6 py-7 sm:px-10">
              <div className="rounded-2xl bg-slate-50 p-5">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="h-5 w-5 text-slate-700" />

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Order Number
                    </p>

                    <p className="mt-1 text-lg font-bold text-slate-900">
                      {result?.orderNumber}
                    </p>
                  </div>
                </div>
              </div>

              {typeof result?.amountNaira === "number" && (
                <div className="rounded-2xl bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Amount Paid
                  </p>

                  <p className="mt-1 text-2xl font-extrabold text-slate-900">
                    {formatNaira(result.amountNaira)}
                  </p>
                </div>
              )}

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-emerald-900">
                  Payment Status: Paid
                </p>

                <p className="mt-1 text-sm text-emerald-800">
                  Order Status: Confirmed
                </p>
              </div>

              <Link
                href="/shop"
                className="flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-4 text-sm font-bold text-white hover:bg-slate-800"
              >
                Continue Shopping
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
        <div className="overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-sm">
          <div className="border-b border-amber-100 bg-amber-50 px-6 py-8 text-center sm:px-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white">
              <Clock3 className="h-8 w-8 text-amber-600" />
            </div>

            <h1 className="mt-4 text-2xl font-bold text-amber-950">
              Payment Not Confirmed
            </h1>

            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-amber-800">
              Paystack returned the transaction, but it has not been
              confirmed as a successful payment.
            </p>
          </div>

          <div className="space-y-4 px-6 py-7 sm:px-10">
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Order Number
              </p>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {result?.orderNumber ?? "Order pending"}
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Payment status:{" "}
              <strong>
                {result?.paystackStatus ?? "not confirmed"}
              </strong>
              .
              <br />
              Your order has not been marked as paid.
            </div>

            <Link
              href="/shop"
              className="flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-4 text-sm font-bold text-white hover:bg-slate-800"
            >
              Return to Store
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function PaystackCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50">
          <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
        </main>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}