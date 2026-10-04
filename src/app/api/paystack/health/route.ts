import { NextResponse } from "next/server";

const PAYSTACK_URL =
  "https://api.paystack.co/integration/payment_session_timeout";

export async function GET() {
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json(
        {
          ok: false,
          service: "paystack",
          mode: "test",
          error: "PAYSTACK_SECRET_KEY is not configured on the server.",
        },
        { status: 500 },
      );
    }

    const response = await fetch(PAYSTACK_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") ?? "";

    let payload: unknown;

    if (contentType.includes("application/json")) {
      payload = await response.json();
    } else {
      payload = await response.text();
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          service: "paystack",
          mode: "test",
          httpStatus: response.status,
          response: payload,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      service: "paystack",
      mode: "test",
      httpStatus: response.status,
      response: payload,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        service: "paystack",
        mode: "test",
        error:
          error instanceof Error
            ? error.message
            : "Unknown Paystack connection error.",
      },
      { status: 502 },
    );
  }
}