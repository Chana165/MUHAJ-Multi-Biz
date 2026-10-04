"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/require-admin";

export type OrderActionResult = {
  ok: boolean;
  message: string;
};

const allowedStatuses = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

type OrderStatus = (typeof allowedStatuses)[number];

function normalizeStatus(value: string): OrderStatus | null {
  const normalized = value.trim().toLowerCase();

  if (
    allowedStatuses.includes(
      normalized as OrderStatus
    )
  ) {
    return normalized as OrderStatus;
  }

  return null;
}

export async function updateOrderStatus(
  orderId: string,
  status: string
): Promise<OrderActionResult> {
  await requireAdmin();

  const supabase = await createClient();

  if (!orderId) {
    return {
      ok: false,
      message: "Order ID is missing.",
    };
  }

  const normalizedStatus = normalizeStatus(status);

  if (!normalizedStatus) {
    return {
      ok: false,
      message: "Invalid order status.",
    };
  }

  const { error } = await supabase
    .from("orders")
    .update({
      status: normalizedStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) {
    return {
      ok: false,
      message:
        error.message || "Unable to update order status.",
    };
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  
  return {
    ok: true,
    message: "Order status updated successfully.",
  };
}