import { requireAdmin } from "@/lib/supabase/require-admin";
import { createClient } from "@/lib/supabase/server";

import InventoryManager from "./InventoryManager";

export default async function InventoryPage() {
  await requireAdmin();

  const supabase = await createClient();

  const [
    { data: productData, error: productError },
    { data: categoryData, error: categoryError },
    { data: imageData, error: imageError },
    { data: movementData, error: movementError },
  ] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id,name,sku,stock,status,category_id,updated_at"
      )
      .order("name", { ascending: true }),

    supabase
      .from("categories")
      .select("id,name"),

    supabase
      .from("product_images")
      .select("product_id,image_url,is_primary,sort_order")
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true }),

    supabase
      .from("inventory_movements")
      .select(
        "id,product_id,quantity_change,reason,created_at"
      )
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (productError) {
    throw new Error(
      productError.message || "Unable to load inventory products."
    );
  }

  if (categoryError) {
    throw new Error(
      categoryError.message || "Unable to load categories."
    );
  }

  if (imageError) {
    throw new Error(
      imageError.message || "Unable to load product images."
    );
  }

  if (movementError) {
    throw new Error(
      movementError.message || "Unable to load inventory movements."
    );
  }

  const categoryMap = new Map(
    (categoryData ?? []).map((category) => [
      category.id,
      category.name,
    ])
  );

  const imageMap = new Map<string, string>();

  for (const image of imageData ?? []) {
    if (
      !imageMap.has(image.product_id) ||
      image.is_primary
    ) {
      imageMap.set(image.product_id, image.image_url);
    }
  }

  const productMap = new Map(
    (productData ?? []).map((product) => [
      product.id,
      product,
    ])
  );

  const products = (productData ?? []).map((product) => ({
    ...product,
    category_name:
      categoryMap.get(product.category_id ?? "") ??
      "Uncategorized",
    image_url: imageMap.get(product.id) ?? null,
  }));

  const movements = (movementData ?? [])
    .map((movement) => ({
      ...movement,
      product_name:
        productMap.get(movement.product_id)?.name ??
        "Unknown product",
    }))
    .filter((movement) => movement.product_id);

  return (
    <InventoryManager
      initialProducts={products}
      initialMovements={movements}
    />
  );
}