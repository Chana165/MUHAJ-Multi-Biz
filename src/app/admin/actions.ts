"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

async function getAdminContext() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/admin/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", userId)
    .maybeSingle();

  if (
    !profile ||
    (profile.role !== "admin" && profile.role !== "super_admin")
  ) {
    redirect("/admin/login");
  }

  return {
    supabase,
    userId,
    profile,
  };
}

export async function signOut() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  redirect("/admin/login");
}

export async function archiveProduct(productId: string) {
  const { supabase } = await getAdminContext();

  const { error } = await supabase
    .from("products")
    .update({
      status: "archived",
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/products");
}

export async function deleteProduct(productId: string) {
  const { supabase } = await getAdminContext();

  const { data: images } = await supabase
    .from("product_images")
    .select("storage_path")
    .eq("product_id", productId);

  const storagePaths =
    images
      ?.map((image) => image.storage_path)
      .filter(
        (path): path is string =>
          typeof path === "string" && path.length > 0,
      ) ?? [];

  if (storagePaths.length > 0) {
    await supabase.storage
      .from("product-images")
      .remove(storagePaths);
  }

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/products");

  redirect("/admin/products");
}