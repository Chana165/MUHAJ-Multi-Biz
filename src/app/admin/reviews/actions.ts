"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { revalidatePath } from "next/cache";

type Row = Record<string, unknown>;

function value(row: Row, keys: string[]) {
  for (const key of keys) {
    if (
      row[key] !== undefined &&
      row[key] !== null &&
      row[key] !== ""
    ) {
      return row[key];
    }
  }
  return null;
}

function config() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL;

  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase environment variables are missing. Check .env.local."
    );
  }

  return { url, key };
}

async function db() {
  const store = await cookies();
  const { url, key } = config();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(items) {
        try {
          items.forEach(({ name, value, options }) => {
            store.set(name, value, options);
          });
        } catch {}
      },
    },
  });
}

function num(value: unknown) {
  const parsed = Number(
    String(value ?? "")
      .replace(/,/g, "")
      .replace(/[^\d.-]/g, "")
  );

  return Number.isFinite(parsed) ? parsed : 0;
}

function nameOf(profile?: Row) {
  if (!profile) return "Customer";

  const full = value(profile, [
    "full_name",
    "name",
    "display_name",
    "username",
  ]);

  if (full) return String(full);

  const first = value(profile, [
    "first_name",
    "firstname",
  ]);

  const last = value(profile, [
    "last_name",
    "lastname",
  ]);

  return (
    [first, last]
      .filter(Boolean)
      .map(String)
      .join(" ")
      .trim() || "Customer"
  );
}

export type Review = {
  id: string;
  productId: string | null;
  productName: string;
  customerId: string | null;
  customerName: string;
  customerEmail: string;
  rating: number;
  title: string;
  comment: string;
  status: string;
  createdAt: string | null;
};

function mapReview(
  review: Row,
  products: Map<string, Row>,
  profiles: Map<string, Row>
): Review {
  const productRaw = value(review, [
    "product_id",
    "productId",
  ]);

  const productId = productRaw
    ? String(productRaw)
    : null;

  const product = productId
    ? products.get(productId)
    : undefined;

  const customerRaw = value(review, [
    "user_id",
    "customer_id",
    "profile_id",
    "userId",
    "customerId",
  ]);

  const customerId = customerRaw
    ? String(customerRaw)
    : null;

  const profile = customerId
    ? profiles.get(customerId)
    : undefined;

  const rawRating = num(
    value(review, [
      "rating",
      "stars",
      "score",
    ])
  );

  const rating = Math.max(
    1,
    Math.min(5, rawRating || 1)
  );

  const created = value(review, [
    "created_at",
    "createdAt",
  ]);

  return {
    id: String(
      value(review, [
        "id",
        "review_id",
      ]) ?? crypto.randomUUID()
    ),
    productId,
    productName: String(
      value(review, [
        "product_name",
      ]) ??
        value(product ?? {}, [
          "name",
          "title",
        ]) ??
        "Product"
    ),
    customerId,
    customerName: nameOf(profile),
    customerEmail: String(
      value(profile ?? {}, [
        "email",
        "email_address",
      ]) ??
        value(review, [
          "email",
          "customer_email",
        ]) ??
        "—"
    ),
    rating,
    title: String(
      value(review, [
        "title",
        "review_title",
        "subject",
      ]) ?? ""
    ),
    comment: String(
      value(review, [
        "comment",
        "content",
        "body",
        "review",
      ]) ?? ""
    ),
    status: String(
      value(review, [
        "status",
        "review_status",
      ]) ?? "pending"
    ).toLowerCase(),
    createdAt: created
      ? String(created)
      : null,
  };
}

export async function getReviews() {
  try {
    const client = await db();

    const [
      { data: reviews, error: reviewsError },
      { data: products, error: productsError },
      { data: profiles, error: profilesError },
    ] = await Promise.all([
      client
        .from("reviews")
        .select("*")
        .order("created_at", {
          ascending: false,
        }),

      client
        .from("products")
        .select("*"),

      client
        .from("profiles")
        .select("*"),
    ]);

    if (reviewsError) {
      return {
        success: false,
        reviews: [],
        error: reviewsError.message,
      };
    }

    if (productsError) {
      return {
        success: false,
        reviews: [],
        error: productsError.message,
      };
    }

    if (profilesError) {
      return {
        success: false,
        reviews: [],
        error: profilesError.message,
      };
    }

    const productMap = new Map<string, Row>();

    for (const row of products ?? []) {
      const item = row as Row;
      const id = value(item, [
        "id",
        "product_id",
      ]);

      if (id) {
        productMap.set(String(id), item);
      }
    }

    const profileMap = new Map<string, Row>();

    for (const row of profiles ?? []) {
      const item = row as Row;
      const id = value(item, [
        "id",
        "user_id",
        "profile_id",
      ]);

      if (id) {
        profileMap.set(String(id), item);
      }
    }

    return {
      success: true,
      reviews: ((reviews ?? []) as Row[]).map(
        (review) =>
          mapReview(
            review,
            productMap,
            profileMap
          )
      ),
    };
  } catch (error) {
    return {
      success: false,
      reviews: [],
      error:
        error instanceof Error
          ? error.message
          : "Unable to load reviews.",
    };
  }
}

export async function updateReviewStatus(
  id: string,
  status: string
) {
  const allowed = [
    "pending",
    "approved",
    "rejected",
  ];

  if (!allowed.includes(status)) {
    return {
      success: false,
      error: "Invalid review status.",
    };
  }

  try {
    const client = await db();

    const { error } = await client
      .from("reviews")
      .update({ status })
      .eq("id", id);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    revalidatePath("/admin/reviews");
    revalidatePath("/");

    return { success: true };
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

export async function deleteReview(id: string) {
  try {
    const client = await db();

    const { error } = await client
      .from("reviews")
      .delete()
      .eq("id", id);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    revalidatePath("/admin/reviews");
    revalidatePath("/");

    return { success: true };
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