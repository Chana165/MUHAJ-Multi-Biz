"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/require-admin";

export type InventoryActionResult = {
  ok: boolean;
  message: string;
};

function parseAdjustment(value: FormDataEntryValue | null) {
  const parsed = Number(value ?? 0);

  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return null;
  }

  return parsed;
}

export async function adjustInventory(
  formData: FormData
): Promise<InventoryActionResult> {
  await requireAdmin();

  const supabase = await createClient();

  const productId = String(formData.get("product_id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const adjustment = parseAdjustment(formData.get("adjustment"));

  if (!productId) {
    return {
      ok: false,
      message: "Product ID is missing.",
    };
  }

  if (adjustment === null || adjustment === 0) {
    return {
      ok: false,
      message: "Enter a valid stock adjustment other than zero.",
    };
  }

  if (Math.abs(adjustment) > 100000) {
    return {
      ok: false,
      message: "Stock adjustment is too large.",
    };
  }

  if (!reason) {
    return {
      ok: false,
      message: "Please enter a reason for the stock adjustment.",
    };
  }

  if (reason.length > 200) {
    return {
      ok: false,
      message: "The adjustment reason must be 200 characters or less.",
    };
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id,name,stock")
    .eq("id", productId)
    .maybeSingle();

  if (productError) {
    return {
      ok: false,
      message: productError.message || "Unable to load product stock.",
    };
  }

  if (!product) {
    return {
      ok: false,
      message: "The selected product no longer exists.",
    };
  }

  const currentStock = Math.max(0, Number(product.stock ?? 0));
  const newStock = currentStock + adjustment;

  if (newStock < 0) {
    return {
      ok: false,
      message: `Stock cannot go below zero. Current stock is ${currentStock}.`,
    };
  }

  const { error: updateError } = await supabase
    .from("products")
    .update({
      stock: newStock,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (updateError) {
    return {
      ok: false,
      message: updateError.message || "Unable to update product stock.",
    };
  }

  const { error: movementError } = await supabase
    .from("inventory_movements")
    .insert({
      product_id: productId,
      variant_id: null,
      quantity_change: adjustment,
      reason,
      reference_id: null,
    });

  if (movementError) {
    return {
      ok: false,
      message:
        "Stock was updated, but the movement history could not be recorded. Please verify the inventory movement table.",
    };
  }

  revalidatePath("/admin/inventory");
  revalidatePath("/admin/products");
  revalidatePath("/admin");
  
  return {
    ok: true,
    message: `${product.name} stock updated from ${currentStock} to ${newStock}.`,
  };
}