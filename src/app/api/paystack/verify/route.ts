import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const requestSchema = z.object({
  reference: z.string().trim().min(3).max(200),
});

const PAYSTACK_VERIFY_BASE =
  "https://api.paystack.co/transaction/verify";

type PaymentRecord = {
  id: string;
  order_id: string;
  amount: number | string;
  currency: string;
  status: string;
  reference: string | null;
};

type OrderRecord = {
  id: string;
  order_number: string;
  total_amount: number | string;
  payment_status: string;
  status: string;
  customer_name: string;
};

type PaystackVerifyResponse = {
  status?: boolean;
  message?: string;
  data?: {
    id?: number;
    domain?: string;
    status?: string;
    reference?: string;
    amount?: number;
    currency?: string;
    gateway_response?: string | null;
    paid_at?: string | null;
    created_at?: string | null;
    channel?: string | null;
    ip_address?: string | null;
    metadata?: unknown;
  };
};

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase server environment variables are missing.",
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function normalize(value: unknown) {
  return String(value ?? "").trim();
}

export async function POST(request: Request) {
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "PAYSTACK_SECRET_KEY is not configured on the server.",
        },
        { status: 500 },
      );
    }

    const body = await request.json();

    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "A valid Paystack reference is required.",
        },
        { status: 400 },
      );
    }

    const reference = parsed.data.reference;

    const supabase = getServerSupabase();

    // --------------------------------------------------------
    // Find the MUHAJ payment first.
    // This prevents us from verifying arbitrary Paystack
    // transactions against the store.
    // --------------------------------------------------------

    const { data: rawPayment, error: paymentError } = await supabase
      .from("payments")
      .select("id, order_id, amount, currency, status, reference")
      .eq("reference", reference)
      .maybeSingle();

    const payment = rawPayment as PaymentRecord | null;

    if (paymentError) {
      return NextResponse.json(
        {
          ok: false,
          error: "Could not load the MUHAJ payment record.",
          details: paymentError.message,
        },
        { status: 502 },
      );
    }

    if (!payment) {
      return NextResponse.json(
        {
          ok: false,
          error: "No MUHAJ payment record matches this Paystack reference.",
        },
        { status: 404 },
      );
    }

    // --------------------------------------------------------
    // Idempotent success handling.
    // --------------------------------------------------------

    if (payment.status === "paid") {
      const { data: rawPaidOrder } = await supabase
        .from("orders")
        .select(
          "id, order_number, total_amount, payment_status, status, customer_name",
        )
        .eq("id", payment.order_id)
        .maybeSingle();

      const paidOrder = rawPaidOrder as OrderRecord | null;

      return NextResponse.json({
        ok: true,
        paid: true,
        alreadyProcessed: true,
        orderNumber: paidOrder?.order_number ?? null,
        paymentStatus: "paid",
        orderStatus: paidOrder?.status ?? "confirmed",
        reference,
        amountNaira: Number(payment.amount),
        currency: "NGN",
        message: "Payment has already been verified.",
      });
    }

    // --------------------------------------------------------
    // Load the protected order.
    // --------------------------------------------------------

    const { data: rawOrder, error: orderError } = await supabase
      .from("orders")
      .select(
        "id, order_number, total_amount, payment_status, status, customer_name",
      )
      .eq("id", payment.order_id)
      .maybeSingle();

    const order = rawOrder as OrderRecord | null;

    if (orderError) {
      return NextResponse.json(
        {
          ok: false,
          error: "Could not load the MUHAJ order.",
          details: orderError.message,
        },
        { status: 502 },
      );
    }

    if (!order) {
      return NextResponse.json(
        {
          ok: false,
          error: "The order connected to this payment no longer exists.",
        },
        { status: 404 },
      );
    }

    const expectedAmountKobo = Math.round(
      Number(order.total_amount) * 100,
    );

    // --------------------------------------------------------
    // Verify the reference directly with Paystack.
    // --------------------------------------------------------

    const paystackUrl =
      `${PAYSTACK_VERIFY_BASE}/${encodeURIComponent(reference)}`;

    const response = await fetch(paystackUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") ?? "";

    let paystackResponse: PaystackVerifyResponse | unknown;

    if (contentType.includes("application/json")) {
      paystackResponse =
        (await response.json()) as PaystackVerifyResponse;
    } else {
      paystackResponse = await response.text();
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          paid: false,
          error: "Paystack verification request failed.",
          httpStatus: response.status,
          response: paystackResponse,
        },
        { status: 502 },
      );
    }

    const result =
      paystackResponse as PaystackVerifyResponse;

    const transaction = result.data;

    if (!result.status || !transaction) {
      return NextResponse.json(
        {
          ok: false,
          paid: false,
          error: "Paystack returned an invalid verification response.",
          response: result,
        },
        { status: 502 },
      );
    }

    const paystackStatus =
      normalize(transaction.status).toLowerCase();

    const verifiedReference =
      normalize(transaction.reference);

    const verifiedAmount =
      Number(transaction.amount ?? 0);

    const verifiedCurrency =
      normalize(transaction.currency).toUpperCase();

    // --------------------------------------------------------
    // SECURITY CHECKS
    // --------------------------------------------------------

    const referenceMatches =
      verifiedReference === reference;

    const amountMatches =
      verifiedAmount === expectedAmountKobo;

    const currencyMatches =
      verifiedCurrency === "NGN";

    const successful =
      paystackStatus === "success";

    if (!successful || !referenceMatches || !amountMatches || !currencyMatches) {

      let localPaymentStatus = "pending";

      if (paystackStatus === "failed") {
        localPaymentStatus = "failed";
      }

      const { error: pendingPaymentUpdateError } = await supabase
        .from("payments")
        .update({
          status: localPaymentStatus,
          gateway_response: {
            stage: "verification",
            verified: false,
            paystack_status: paystackStatus,
            reference_match: referenceMatches,
            amount_match: amountMatches,
            currency_match: currencyMatches,
            gateway_response:
              transaction.gateway_response ?? null,
            paid_at: transaction.paid_at ?? null,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      if (pendingPaymentUpdateError) {
        return NextResponse.json(
          {
            ok: false,
            paid: false,
            error: "Payment was not successful and the payment record could not be updated.",
            details: pendingPaymentUpdateError.message,
            paystackStatus,
          },
          { status: 502 },
        );
      }

      return NextResponse.json({
        ok: true,
        paid: false,
        alreadyProcessed: false,
        orderNumber: order.order_number,
        paymentStatus: localPaymentStatus,
        orderStatus: order.status,
        reference,
        paystackStatus,
        expectedAmountKobo,
        verifiedAmountKobo: verifiedAmount,
        currency: verifiedCurrency || "NGN",
        checks: {
          successful,
          referenceMatches,
          amountMatches,
          currencyMatches,
        },
        message:
          "Payment has not been confirmed as successful.",
      });
    }

    // --------------------------------------------------------
    // SUCCESS
    // --------------------------------------------------------

    const paidAt =
      transaction.paid_at ??
      new Date().toISOString();

    const { error: paymentSuccessError } = await supabase
      .from("payments")
      .update({
        status: "paid",
        paid_at: paidAt,
        gateway_response: {
          stage: "verification",
          verified: true,
          paystack_status: paystackStatus,
          transaction_id: transaction.id ?? null,
          gateway_response:
            transaction.gateway_response ?? null,
          channel: transaction.channel ?? null,
          paid_at: paidAt,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id)
      .neq("status", "paid");

    if (paymentSuccessError) {
      return NextResponse.json(
        {
          ok: false,
          paid: false,
          error: "Payment was verified by Paystack, but the MUHAJ payment record could not be updated.",
          details: paymentSuccessError.message,
        },
        { status: 502 },
      );
    }

    const { error: orderUpdateError } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        status: "confirmed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .neq("payment_status", "paid");

    if (orderUpdateError) {
      return NextResponse.json(
        {
          ok: false,
          paid: false,
          error:
            "Payment was verified and recorded, but the order status could not be updated.",
          details: orderUpdateError.message,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      paid: true,
      alreadyProcessed: false,
      orderNumber: order.order_number,
      paymentStatus: "paid",
      orderStatus: "confirmed",
      reference,
      amountNaira: Number(order.total_amount),
      amountKobo: expectedAmountKobo,
      currency: "NGN",
      paystackStatus,
      paidAt,
      checks: {
        successful,
        referenceMatches,
        amountMatches,
        currencyMatches,
      },
      message: "Payment verified successfully.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        paid: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected payment verification error.",
      },
      { status: 500 },
    );
  }
}