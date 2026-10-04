import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const PAYSTACK_SUCCESS_EVENT = "charge.success";

type PaystackChargeData = {
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
  metadata?: unknown;
};

type PaystackWebhookPayload = {
  event?: string;
  data?: PaystackChargeData;
};

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

function isValidSignature(
  rawBody: string,
  signature: string,
  secretKey: string,
) {
  const expected = crypto
    .createHmac("sha512", secretKey)
    .update(rawBody)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(signature, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    expectedBuffer,
    receivedBuffer,
  );
}

export async function POST(request: Request) {
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "PAYSTACK_SECRET_KEY is not configured.",
        },
        { status: 500 },
      );
    }

    // IMPORTANT:
    // Use the exact raw request body for signature verification.
    const rawBody = await request.text();

    const signature =
      request.headers.get("x-paystack-signature") ?? "";

    if (!signature) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing Paystack webhook signature.",
        },
        { status: 401 },
      );
    }

    if (!isValidSignature(rawBody, signature, secretKey)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid Paystack webhook signature.",
        },
        { status: 401 },
      );
    }

    let payload: PaystackWebhookPayload;

    try {
      payload = JSON.parse(rawBody) as PaystackWebhookPayload;
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid webhook JSON payload.",
        },
        { status: 400 },
      );
    }

    const event = String(payload.event ?? "");
    const data = payload.data;

    // --------------------------------------------------------
    // We only act on successful payment events.
    // Valid Paystack events that are not relevant to MUHAJ
    // are acknowledged safely.
    // --------------------------------------------------------

    if (event !== PAYSTACK_SUCCESS_EVENT) {
      return NextResponse.json({
        ok: true,
        handled: false,
        event,
        message: "Webhook received and acknowledged.",
      });
    }

    if (!data) {
      return NextResponse.json(
        {
          ok: false,
          error: "charge.success event has no transaction data.",
        },
        { status: 400 },
      );
    }

    const reference = String(data.reference ?? "").trim();

    if (!reference) {
      return NextResponse.json(
        {
          ok: false,
          error: "charge.success event has no transaction reference.",
        },
        { status: 400 },
      );
    }

    const supabase = getServerSupabase();

    // --------------------------------------------------------
    // Locate the MUHAJ payment.
    // --------------------------------------------------------

    const { data: rawPayment, error: paymentLookupError } =
      await supabase
        .from("payments")
        .select(
          "id, order_id, amount, currency, status, reference",
        )
        .eq("reference", reference)
        .maybeSingle();

    const payment = rawPayment as PaymentRecord | null;

    if (paymentLookupError) {
      return NextResponse.json(
        {
          ok: false,
          error: "Could not load the MUHAJ payment record.",
          details: paymentLookupError.message,
        },
        { status: 500 },
      );
    }

    // A valid Paystack webhook can legitimately arrive for another
    // integration transaction. Acknowledge it without modifying MUHAJ.
    if (!payment) {
      return NextResponse.json({
        ok: true,
        handled: false,
        event,
        reference,
        message: "Reference does not belong to a MUHAJ payment.",
      });
    }

    // --------------------------------------------------------
    // Idempotency.
    // --------------------------------------------------------

    if (payment.status === "paid") {
      return NextResponse.json({
        ok: true,
        handled: true,
        alreadyProcessed: true,
        event,
        reference,
        paymentStatus: "paid",
        message: "Payment was already processed.",
      });
    }

    // --------------------------------------------------------
    // Load protected order.
    // --------------------------------------------------------

    const { data: rawOrder, error: orderLookupError } =
      await supabase
        .from("orders")
        .select(
          "id, order_number, total_amount, payment_status, status",
        )
        .eq("id", payment.order_id)
        .maybeSingle();

    const order = rawOrder as OrderRecord | null;

    if (orderLookupError) {
      return NextResponse.json(
        {
          ok: false,
          error: "Could not load the MUHAJ order.",
          details: orderLookupError.message,
        },
        { status: 500 },
      );
    }

    if (!order) {
      return NextResponse.json(
        {
          ok: false,
          error: "The order connected to this payment was not found.",
        },
        { status: 404 },
      );
    }

    // --------------------------------------------------------
    // SECURITY VALIDATION
    // --------------------------------------------------------

    const expectedAmountKobo = Math.round(
      Number(order.total_amount) * 100,
    );

    const receivedAmountKobo = Number(data.amount ?? 0);

    const referenceMatches =
      String(payment.reference ?? "").trim() === reference;

    const amountMatches =
      receivedAmountKobo === expectedAmountKobo;

    const paymentCurrency =
      String(payment.currency ?? "").toUpperCase();

    const webhookCurrency =
      String(data.currency ?? "").toUpperCase();

    const currencyMatches =
      paymentCurrency === "NGN" &&
      webhookCurrency === "NGN";

    const statusIsSuccess =
      String(data.status ?? "").toLowerCase() === "success";

    if (
      !referenceMatches ||
      !amountMatches ||
      !currencyMatches ||
      !statusIsSuccess
    ) {
      await supabase
        .from("payments")
        .update({
          gateway_response: {
            stage: "webhook",
            verified: false,
            event,
            reference,
            paystack_status: data.status ?? null,
            received_amount_kobo: receivedAmountKobo,
            expected_amount_kobo: expectedAmountKobo,
            received_currency: webhookCurrency,
            expected_currency: "NGN",
            reference_match: referenceMatches,
            amount_match: amountMatches,
            currency_match: currencyMatches,
            gateway_response:
              data.gateway_response ?? null,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      return NextResponse.json(
        {
          ok: true,
          handled: false,
          paymentAccepted: false,
          orderNumber: order.order_number,
          reference,
          checks: {
            statusIsSuccess,
            referenceMatches,
            amountMatches,
            currencyMatches,
          },
          message:
            "Webhook received but payment security checks did not pass.",
        },
        { status: 200 },
      );
    }

    // --------------------------------------------------------
    // MARK PAYMENT AS PAID
    // --------------------------------------------------------

    const paidAt =
      data.paid_at ??
      new Date().toISOString();

    const { error: paymentUpdateError } =
      await supabase
        .from("payments")
        .update({
          status: "paid",
          paid_at: paidAt,
          gateway_response: {
            stage: "webhook",
            verified: true,
            event,
            paystack_transaction_id: data.id ?? null,
            paystack_status: data.status ?? null,
            gateway_response:
              data.gateway_response ?? null,
            channel: data.channel ?? null,
            paid_at: paidAt,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id)
        .neq("status", "paid");

    if (paymentUpdateError) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Webhook was valid, but the MUHAJ payment record could not be updated.",
          details: paymentUpdateError.message,
        },
        { status: 500 },
      );
    }

    // --------------------------------------------------------
    // CONFIRM ORDER
    // --------------------------------------------------------

    const { error: orderUpdateError } =
      await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          status: "confirmed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

    if (orderUpdateError) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Payment was recorded, but the order could not be updated.",
          details: orderUpdateError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      handled: true,
      alreadyProcessed: false,
      event,
      orderNumber: order.order_number,
      reference,
      paymentStatus: "paid",
      orderStatus: "confirmed",
      amountNaira: Number(order.total_amount),
      amountKobo: expectedAmountKobo,
      currency: "NGN",
      paidAt,
      checks: {
        statusIsSuccess,
        referenceMatches,
        amountMatches,
        currencyMatches,
      },
      message: "Payment successfully processed from Paystack webhook.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected webhook processing error.",
      },
      { status: 500 },
    );
  }
}