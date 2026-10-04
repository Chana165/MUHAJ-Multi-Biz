"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/require-admin";

export type CategoryActionResult = {
  ok: boolean;
  message: string;
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseSortOrder(value: FormDataEntryValue | null) {
  const parsed = Number(value ?? 0);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.floor(parsed);
}

export async function createCategory(
  formData: FormData
): Promise<CategoryActionResult> {
  await requireAdmin();

  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const sortOrder = parseSortOrder(formData.get("sort_order"));
  const isActive = formData.get("is_active") === "on";

  if (!name) {
    return {
      ok: false,
      message: "Category name is required.",
    };
  }

  if (name.length > 80) {
    return {
      ok: false,
      message: "Category name must be 80 characters or less.",
    };
  }

  const slug = slugify(name);

  if (!slug) {
    return {
      ok: false,
      message: "Please enter a valid category name.",
    };
  }

  const { data: existingSlug } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existingSlug) {
    return {
      ok: false,
      message: "A category with this name already exists.",
    };
  }

  const { data: existingName } = await supabase
    .from("categories")
    .select("id")
    .ilike("name", name)
    .maybeSingle();

  if (existingName) {
    return {
      ok: false,
      message: "A category with this name already exists.",
    };
  }

  const { error } = await supabase.from("categories").insert({
    name,
    slug,
    description: description || null,
    image_url: null,
    is_active: isActive,
    sort_order: sortOrder,
  });

  if (error) {
    return {
      ok: false,
      message: error.message || "Unable to create category.",
    };
  }

  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  revalidatePath("/admin/products/new");
  revalidatePath("/admin");

  return {
    ok: true,
    message: "Category created successfully.",
  };
}

export async function updateCategory(
  formData: FormData
): Promise<CategoryActionResult> {
  await requireAdmin();

  const supabase = await createClient();

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const sortOrder = parseSortOrder(formData.get("sort_order"));
  const isActive = formData.get("is_active") === "on";

  if (!id) {
    return {
      ok: false,
      message: "Category ID is missing.",
    };
  }

  if (!name) {
    return {
      ok: false,
      message: "Category name is required.",
    };
  }

  if (name.length > 80) {
    return {
      ok: false,
      message: "Category name must be 80 characters or less.",
    };
  }

  const slug = slugify(name);

  if (!slug) {
    return {
      ok: false,
      message: "Please enter a valid category name.",
    };
  }

  const { data: existingSlug } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", slug)
    .neq("id", id)
    .maybeSingle();

  if (existingSlug) {
    return {
      ok: false,
      message: "Another category already uses this name.",
    };
  }

  const { data: existingName } = await supabase
    .from("categories")
    .select("id")
    .ilike("name", name)
    .neq("id", id)
    .maybeSingle();

  if (existingName) {
    return {
      ok: false,
      message: "Another category already uses this name.",
    };
  }

  const { error } = await supabase
    .from("categories")
    .update({
      name,
      slug,
      description: description || null,
      is_active: isActive,
      sort_order: sortOrder,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return {
      ok: false,
      message: error.message || "Unable to update category.",
    };
  }

  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  revalidatePath("/admin/products/new");
  revalidatePath("/admin");

  return {
    ok: true,
    message: "Category updated successfully.",
  };
}

export async function toggleCategory(
  id: string,
  isActive: boolean
): Promise<CategoryActionResult> {
  await requireAdmin();

  const supabase = await createClient();

  if (!id) {
    return {
      ok: false,
      message: "Category ID is missing.",
    };
  }

  const { error } = await supabase
    .from("categories")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return {
      ok: false,
      message: error.message || "Unable to update category status.",
    };
  }

  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  revalidatePath("/admin/products/new");

  return {
    ok: true,
    message: isActive
      ? "Category activated successfully."
      : "Category deactivated successfully.",
  };
}

export async function deleteCategory(
  id: string
): Promise<CategoryActionResult> {
  await requireAdmin();

  const supabase = await createClient();

  if (!id) {
    return {
      ok: false,
      message: "Category ID is missing.",
    };
  }

  const { count, error: countError } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);

  if (countError) {
    return {
      ok: false,
      message: countError.message || "Unable to check category products.",
    };
  }

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      message:
        "This category cannot be deleted because products are assigned to it. Deactivate it instead.",
    };
  }

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id);

  if (error) {
    return {
      ok: false,
      message: error.message || "Unable to delete category.",
    };
  }

  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  revalidatePath("/admin/products/new");
  revalidatePath("/admin");

  return {
    ok: true,
    message: "Category deleted successfully.",
  };
}