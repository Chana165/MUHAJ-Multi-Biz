import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const requestSchema = z.object({
  orderNumber: z.string().trim().min(5).max(100),
  email: z.string().trim().email(),
});

type OrderRecord = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  status: string;
  payment_status: string;
  subtotal: number | string;
  shipping_fee: number | string;
  discount_amount: number | string;
  total_amount: number | string;
  shipping_address: unknown;
  created_at: string;
  updated_at: string;
};

type OrderItemRecord = {
  id: string;
  product_name: string;
  product_sku: string | null;
  unit_price: number | string;
  quantity: number;
  total_price: number | string;
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

function formatAddress(value: unknown) {
  if (!value || typeof value !== "object") {
    return {
      address: "",
      city: "",
      state: "",
      country: "",
    };
  }

  const source = value as Record<string, unknown>;

  return {
    address: String(
      source.address ??
        source.street ??
        source.line1 ??
        "",
    ),
    city: String(source.city ?? ""),
    state: String(source.state ?? ""),
    country: String(
      source.country ?? "Nigeria",
    ),
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Please provide a valid order number and email address.",
        },
        { status: 400 },
      );
    }

    const orderNumber =
      parsed.data.orderNumber.trim().toUpperCase();

    const email =
      parsed.data.email.trim().toLowerCase();

    const supabase = getServerSupabase();

    // --------------------------------------------------------
    // Require BOTH the order number and the customer's email.
    // --------------------------------------------------------

    const { data: rawOrder, error: orderError } =
      await supabase
        .from("orders")
        .select(
          [
            "id",
            "order_number",
            "customer_name",
            "customer_email",
            "status",
            "payment_status",
            "subtotal",
            "shipping_fee",
            "discount_amount",
            "total_amount",
            "shipping_address",
            "created_at",
            "updated_at",
          ].join(", "),
        )
        .eq("order_number", orderNumber)
        .ilike("customer_email", email)
        .maybeSingle();

    const order = rawOrder as OrderRecord | null;

    if (orderError) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unable to retrieve the order.",
          details: orderError.message,
        },
        { status: 500 },
      );
    }

    if (!order) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "We could not find an order matching that order number and email address.",
        },
        { status: 404 },
      );
    }

    // --------------------------------------------------------
    // Load order items.
    // --------------------------------------------------------

    const { data: rawItems, error: itemsError } =
      await supabase
        .from("order_items")
        .select(
          "id, product_name, product_sku, unit_price, quantity, total_price",
        )
        .eq("order_id", order.id)
        .order("created_at", {
          ascending: true,
        });

    if (itemsError) {
      return NextResponse.json(
        {
          ok: false,
          error: "The order was found but its items could not be loaded.",
          details: itemsError.message,
        },
        { status: 500 },
      );
    }

    const items =
      (rawItems ?? []) as OrderItemRecord[];

    return NextResponse.json({
      ok: true,
      order: {
        id: order.id,
        orderNumber: order.order_number,
        customerName: order.customer_name,
        status: order.status,
        paymentStatus: order.payment_status,
        subtotal: Number(order.subtotal),
        shippingFee: Number(order.shipping_fee),
        discountAmount: Number(order.discount_amount),
        totalAmount: Number(order.total_amount),
        shippingAddress: formatAddress(
          order.shipping_address,
        ),
        createdAt: order.created_at,
        updatedAt: order.updated_at,
      },
      items: items.map((item) => ({
        id: item.id,
        productName: item.product_name,
        productSku: item.product_sku,
        unitPrice: Number(item.unit_price),
        quantity: Number(item.quantity),
        totalPrice: Number(item.total_price),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected order tracking error.",
      },
      { status: 500 },
    );
  }
}