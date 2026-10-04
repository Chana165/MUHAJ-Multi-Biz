import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RequestItem = {
  id: string;
  quantity: number;
};

type RequestBody = {
  customer?: {
    full_name?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    notes?: string;
  };
  shipping_method_id?: string;
  items?: RequestItem[];
};

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;

    const customer = body.customer;

    const fullName = cleanText(customer?.full_name, 150);
    const phone = cleanText(customer?.phone, 40);
    const email = cleanText(customer?.email, 200).toLowerCase();

    const address = cleanText(customer?.address, 500);
    const city = cleanText(customer?.city, 100);
    const state = cleanText(customer?.state, 100);
    const notes = cleanText(customer?.notes, 1000);

    const shippingMethodId = cleanText(
      body.shipping_method_id,
      100
    );

    const items = Array.isArray(body.items)
      ? body.items
          .filter(
            (item) =>
              item &&
              typeof item.id === "string" &&
              typeof item.quantity === "number" &&
              Number.isInteger(item.quantity) &&
              item.quantity > 0
          )
          .slice(0, 50)
          .map((item) => ({
            id: item.id,
            quantity: item.quantity,
          }))
      : [];

    if (!fullName) {
      return NextResponse.json(
        { error: "Customer name is required." },
        { status: 400 }
      );
    }

    if (!phone) {
      return NextResponse.json(
        { error: "Customer phone is required." },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "Customer email is required." },
        { status: 400 }
      );
    }

    if (!address || !city || !state) {
      return NextResponse.json(
        { error: "Complete delivery address is required." },
        { status: 400 }
      );
    }

    if (!shippingMethodId) {
      return NextResponse.json(
        { error: "Shipping method is required." },
        { status: 400 }
      );
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Your order must contain at least one product." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase.rpc(
      "create_guest_order",
      {
        p_customer_name: fullName,
        p_customer_email: email,
        p_customer_phone: phone,
        p_shipping_address: {
          address,
          city,
          state,
          country: "Nigeria",
        },
        p_notes: notes || null,
        p_shipping_method_id: shippingMethodId,
        p_items: items,
      }
    );

    if (error) {
      console.error("Order creation error:", error);

      return NextResponse.json(
        {
          error:
            error.message ||
            "We could not create your order.",
        },
        { status: 400 }
      );
    }

    const createdOrder = Array.isArray(data)
      ? data[0]
      : data;

    if (!createdOrder?.order_id) {
      return NextResponse.json(
        {
          error:
            "The order was not created successfully. Please try again.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      order: {
        id: createdOrder.order_id,
        order_number: createdOrder.order_number,
        subtotal: Number(createdOrder.subtotal),
        shipping_fee: Number(createdOrder.shipping_fee),
        total_amount: Number(createdOrder.total_amount),
      },
    });
  } catch (error) {
    console.error("Unexpected order API error:", error);

    return NextResponse.json(
      {
        error: "An unexpected error occurred while creating your order.",
      },
      { status: 500 }
    );
  }
}