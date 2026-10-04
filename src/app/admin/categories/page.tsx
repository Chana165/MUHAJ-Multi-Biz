import { requireAdmin } from "@/lib/supabase/require-admin";
import { createClient } from "@/lib/supabase/server";

import CategoryManager from "./CategoryManager";

export default async function CategoriesPage() {
  await requireAdmin();

  const supabase = await createClient();

  const [{ data: categoriesData, error: categoriesError }, { data: productsData }] =
    await Promise.all([
      supabase
        .from("categories")
        .select(
          "id,name,slug,description,image_url,is_active,sort_order,created_at"
        )
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),

      supabase.from("products").select("category_id"),
    ]);

  if (categoriesError) {
    throw new Error(
      categoriesError.message || "Unable to load categories."
    );
  }

  const productCounts = new Map<string, number>();

  for (const product of productsData ?? []) {
    if (!product.category_id) {
      continue;
    }

    productCounts.set(
      product.category_id,
      (productCounts.get(product.category_id) ?? 0) + 1
    );
  }

  const categories = (categoriesData ?? []).map((category) => ({
    ...category,
    product_count: productCounts.get(category.id) ?? 0,
  }));

  return (
    <CategoryManager
      initialCategories={categories}
    />
  );
}