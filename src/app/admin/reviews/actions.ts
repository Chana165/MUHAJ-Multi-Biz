"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/require-admin";

export type ReviewStatus = "pending" | "approved" | "rejected";

export type AdminReview = {
  id: string;
  productId: string | null;
  productName: string;
  productSlug: string;
  userId: string | null;
  reviewerName: string;
  rating: number;
  comment: string;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string | null;
};

type Row = Record<string, unknown>;

function text(value: unknown) {
  return value === null || value === undefined
    ? ""
    : String(value);
}

function normalizeStatus(value: unknown): ReviewStatus {
  const status = text(value).toLowerCase();

  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";

  return "pending";
}

export async function getReviews() {
  try {
    await requireAdmin();

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("reviews")
      .select(
        "id, product_id, user_id, rating, comment, status, created_at, updated_at"
      )
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      return {
        success: false,
        reviews: [] as AdminReview[],
        error: error.message,
      };
    }

    const rows = (data ?? []) as Row[];

    const productIds = Array.from(
      new Set(
        rows
          .map((row) => text(row.product_id))
          .filter(Boolean)
      )
    );

    const userIds = Array.from(
      new Set(
        rows
          .map((row) => text(row.user_id))
          .filter(Boolean)
      )
    );

    const [productsResult, profilesResult] =
      await Promise.all([
        productIds.length
          ? supabase
              .from("products")
              .select("id, name, slug")
              .in("id", productIds)
          : Promise.resolve({
              data: [],
              error: null,
            }),

        userIds.length
          ? supabase
              .from("profiles")
              .select("id, full_name")
              .in("id", userIds)
          : Promise.resolve({
              data: [],
              error: null,
            }),
      ]);

    if (productsResult.error) {
      return {
        success: false,
        reviews: [] as AdminReview[],
        error: productsResult.error.message,
      };
    }

    if (profilesResult.error) {
      return {
        success: false,
        reviews: [] as AdminReview[],
        error: profilesResult.error.message,
      };
    }

    const productMap = new Map<
      string,
      {
        name: string;
        slug: string;
      }
    >();

    for (const product of (productsResult.data ?? []) as Row[]) {
      productMap.set(text(product.id), {
        name: text(product.name) || "Unknown Product",
        slug: text(product.slug),
      });
    }

    const profileMap = new Map<string, string>();

    for (const profile of (profilesResult.data ?? []) as Row[]) {
      profileMap.set(
        text(profile.id),
        text(profile.full_name) || "Customer"
      );
    }

    const reviews: AdminReview[] = rows.map((row) => {
      const productId = text(row.product_id);
      const userId = text(row.user_id);
      const product = productMap.get(productId);

      return {
        id: text(row.id),
        productId: productId || null,
        productName:
          product?.name || "Product not found",
        productSlug: product?.slug || "",
        userId: userId || null,
        reviewerName:
          profileMap.get(userId) || "Customer",
        rating: Math.max(
          0,
          Math.min(5, Number(row.rating ?? 0))
        ),
        comment: text(row.comment),
        status: normalizeStatus(row.status),
        createdAt: text(row.created_at),
        updatedAt: row.updated_at
          ? text(row.updated_at)
          : null,
      };
    });

    return {
      success: true,
      reviews,
    };
  } catch (error) {
    return {
      success: false,
      reviews: [] as AdminReview[],
      error:
        error instanceof Error
          ? error.message
          : "Unable to load reviews.",
    };
  }
}

export async function updateReviewStatus(
  reviewId: string,
  status: ReviewStatus
) {
  if (!reviewId) {
    return {
      success: false,
      error: "Review ID is required.",
    };
  }

  if (
    status !== "pending" &&
    status !== "approved" &&
    status !== "rejected"
  ) {
    return {
      success: false,
      error: "Invalid review status.",
    };
  }

  try {
    await requireAdmin();

    const supabase = await createClient();

    const { error } = await supabase
      .from("reviews")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reviewId);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    revalidatePath("/admin/reviews");
    revalidatePath("/");
    revalidatePath("/shop");

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to update review status.",
    };
  }
}

export async function deleteReview(reviewId: string) {
  if (!reviewId) {
    return {
      success: false,
      error: "Review ID is required.",
    };
  }

  try {
    await requireAdmin();

    const supabase = await createClient();

    const { error } = await supabase
      .from("reviews")
      .delete()
      .eq("id", reviewId);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    revalidatePath("/admin/reviews");
    revalidatePath("/");
    revalidatePath("/shop");

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to delete review.",
    };
  }
}