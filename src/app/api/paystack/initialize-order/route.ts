import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const PAYSTACK_INITIALIZE_URL =
  "https://api.paystack.co/transaction/initialize";

const requestSchema = z.object({
  orderId: z.string().trim().min(3).max(200),
});

type OrderRecord = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  total_amount: number | string;
  status: string;
  payment_status: string;
};

type PaymentRecord = {
  id: string;
  amount: number | string;
  currency: string;
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

function createReference(orderNumber: string) {
  const safeOrderNumber = orderNumber.replace(
    /[^A-Za-z0-9.=+-]/g,
    "-",
  );

  const timePart = Date.now().toString(36).toUpperCase();

  return `MUHAJ-${safeOrderNumber}-${timePart}`;
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
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
          error: "Invalid order payment request.",
        },
        { status: 400 },
      );
    }

    const orderReference = parsed.data.orderId;
    const supabase = getServerSupabase();

    // --------------------------------------------------------
    // Accept either:
    // 1. Supabase order UUID
    // 2. Human-readable MUHAJ order number
    // --------------------------------------------------------

    let orderQuery = supabase
      .from("orders")
      .select(
        "id, order_number, customer_name, customer_email, total_amount, status, payment_status",
      );

    if (looksLikeUuid(orderReference)) {
      orderQuery = orderQuery.eq("id", orderReference);
    } else {
      orderQuery = orderQuery.eq(
        "order_number",
        orderReference,
      );
    }

    const { data: rawOrder, error: orderError } =
      await orderQuery.maybeSingle();

    const order = rawOrder as OrderRecord | null;

    if (orderError) {
      return NextResponse.json(
        {
          ok: false,
          error: "Could not load the order.",
          details: orderError.message,
        },
        { status: 502 },
      );
    }

    if (!order) {
      return NextResponse.json(
        {
          ok: false,
          error: "Order not found.",
        },
        { status: 404 },
      );
    }

    if (order.status === "cancelled") {
      return NextResponse.json(
        {
          ok: false,
          error: "This order has been cancelled.",
          orderNumber: order.order_number,
        },
        { status: 409 },
      );
    }

    if (order.payment_status === "paid") {
      return NextResponse.json(
        {
          ok: false,
          error: "This order has already been paid.",
          orderNumber: order.order_number,
        },
        { status: 409 },
      );
    }

    const amountNaira = Number(order.total_amount);

    if (!Number.isFinite(amountNaira) || amountNaira <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "The order has an invalid payment amount.",
        },
        { status: 400 },
      );
    }

    const amountKobo = Math.round(amountNaira * 100);

    if (amountKobo < 100) {
      return NextResponse.json(
        {
          ok: false,
          error: "The order amount is below the supported payment amount.",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------------
    // Find the existing pending MUHAJ payment record.
    // --------------------------------------------------------

    const { data: rawPayment, error: paymentLookupError } =
      await supabase
        .from("payments")
        .select("id, amount, currency, status")
        .eq("order_id", order.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    const payment = rawPayment as PaymentRecord | null;

    if (paymentLookupError) {
      return NextResponse.json(
        {
          ok: false,
          error: "Could not load the pending payment record.",
          details: paymentLookupError.message,
        },
        { status: 502 },
      );
    }

    if (!payment) {
      return NextResponse.json(
        {
          ok: false,
          error: "No pending payment record exists for this order.",
          orderNumber: order.order_number,
        },
        { status: 409 },
      );
    }

    const paymentAmount = Number(payment.amount);

    if (
      !Number.isFinite(paymentAmount) ||
      Math.abs(paymentAmount - amountNaira) > 0.01
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Order amount and payment amount do not match.",
          orderNumber: order.order_number,
        },
        { status: 409 },
      );
    }

    if (
      String(payment.currency).toUpperCase() !== "NGN"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "The payment currency is not NGN.",
        },
        { status: 409 },
      );
    }

    // --------------------------------------------------------
    // Create Paystack transaction reference.
    // --------------------------------------------------------

    const reference = createReference(
      order.order_number,
    );

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";

    const callbackUrl =
      `${origin}/checkout/payment/callback?order=${encodeURIComponent(order.order_number)}`;

    const payload = {
      email: order.customer_email,
      amount: String(amountKobo),
      currency: "NGN",
      reference,
      callback_url: callbackUrl,
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
        customer_name: order.customer_name,
        source: "MUHAJ Multi Biz",
      },
    };

    // --------------------------------------------------------
    // Initialize Paystack.
    // --------------------------------------------------------

    const response = await fetch(
      PAYSTACK_INITIALIZE_URL,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      },
    );

    const contentType =
      response.headers.get("content-type") ?? "";

    let paystackResponse: unknown;

    if (contentType.includes("application/json")) {
      paystackResponse = await response.json();
    } else {
      paystackResponse = await response.text();
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Paystack rejected the payment initialization.",
          httpStatus: response.status,
          response: paystackResponse,
        },
        { status: 502 },
      );
    }

    const result = paystackResponse as {
      status?: boolean;
      message?: string;
      data?: {
        authorization_url?: string;
        access_code?: string;
        reference?: string;
      };
    };

    if (
      !result.status ||
      !result.data?.authorization_url
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Paystack did not return a valid checkout URL.",
          response: result,
        },
        { status: 502 },
      );
    }

    const returnedReference =
      result.data.reference ?? reference;

    // --------------------------------------------------------
    // Save Paystack reference to the existing payment record.
    // --------------------------------------------------------

    const { error: paymentUpdateError } =
      await supabase
        .from("payments")
        .update({
          reference: returnedReference,
          provider: "paystack",
          amount: amountNaira,
          currency: "NGN",
          status: "pending",
          gateway_response: {
            stage: "initialized",
            mode: "test",
            paystack_message:
              result.message ?? null,
            access_code:
              result.data.access_code ?? null,
            reference: returnedReference,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

    if (paymentUpdateError) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Paystack transaction was initialized, but the payment record could not be updated.",
          details: paymentUpdateError.message,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      mode: "test",
      service: "paystack",
      orderId: order.id,
      orderNumber: order.order_number,
      customerName: order.customer_name,
      amountNaira,
      amountKobo,
      paymentId: payment.id,
      reference: returnedReference,
      authorizationUrl:
        result.data.authorization_url,
      accessCode:
        result.data.access_code ?? null,
      message:
        result.message ??
        "Authorization URL created",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected payment initialization error.",
      },
      { status: 500 },
    );
  }
}