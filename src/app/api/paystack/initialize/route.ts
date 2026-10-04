import { NextResponse } from "next/server";
import { z } from "zod";

const PAYSTACK_INITIALIZE_URL =
  "https://api.paystack.co/transaction/initialize";

const requestSchema = z.object({
  email: z.string().trim().email(),
  amountNaira: z.number().positive().finite(),
  orderNumber: z
    .string()
    .trim()
    .min(3)
    .max(100)
    .regex(
      /^[A-Za-z0-9.=+-]+$/,
      "Order number contains unsupported characters.",
    ),
  callbackUrl: z.string().trim().url().optional(),
});

function createReference(orderNumber: string) {
  const safeOrderNumber = orderNumber.replace(/[^A-Za-z0-9.=+-]/g, "-");
  const timePart = Date.now().toString(36).toUpperCase();

  return `MUHAJ-${safeOrderNumber}-${timePart}`;
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
          error: "Invalid payment initialization request.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { email, amountNaira, orderNumber, callbackUrl } = parsed.data;

    // Paystack expects NGN in kobo (subunit), so ₦7,600 becomes 760000.
    const amountKobo = Math.round(amountNaira * 100);

    if (amountKobo < 100) {
      return NextResponse.json(
        {
          ok: false,
          error: "Payment amount is below the minimum supported value.",
        },
        { status: 400 },
      );
    }

    const reference = createReference(orderNumber);

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";

    const finalCallbackUrl =
      callbackUrl || `${origin}/checkout/payment/callback`;

    const payload = {
      email,
      amount: String(amountKobo),
      currency: "NGN",
      reference,
      callback_url: finalCallbackUrl,
      metadata: JSON.stringify({
        order_number: orderNumber,
        source: "MUHAJ Multi Biz",
      }),
    };

    const response = await fetch(PAYSTACK_INITIALIZE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") ?? "";

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
          error: "Paystack rejected transaction initialization.",
          httpStatus: response.status,
          response: paystackResponse,
        },
        { status: 502 },
      );
    }

    const paystackJson = paystackResponse as {
      status?: boolean;
      message?: string;
      data?: {
        authorization_url?: string;
        access_code?: string;
        reference?: string;
      };
    };

    if (!paystackJson.status || !paystackJson.data?.authorization_url) {
      return NextResponse.json(
        {
          ok: false,
          error: "Paystack did not return a valid authorization URL.",
          response: paystackJson,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      mode: "test",
      service: "paystack",
      orderNumber,
      amountNaira,
      amountKobo,
      reference: paystackJson.data.reference ?? reference,
      authorizationUrl: paystackJson.data.authorization_url,
      accessCode: paystackJson.data.access_code ?? null,
      message: paystackJson.message ?? "Authorization URL created",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected Paystack initialization error.",
      },
      { status: 500 },
    );
  }
}