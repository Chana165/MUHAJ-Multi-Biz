"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/require-admin";

type Row = Record<string, unknown>;

export type MarketingProduct = {
  id: string;
  name: string;
  sku: string;
  price: number;
  salePrice: number | null;
  stock: number;
  featured: boolean;
  status: string;
  categoryId: string | null;
};

export type MarketingCoupon = {
  id: string;
  code: string;
  description: string;
  discountType: string;
  discountValue: number;
  minimumOrderAmount: number | null;
  usageLimit: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  isExpired: boolean;
  createdAt: string | null;
};

export type MarketingBanner = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  buttonText: string;
  buttonUrl: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string | null;
};

export type MarketingCampaign = {
  id: string;
  name: string;
  description: string;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  createdBy: string | null;
  createdAt: string | null;
};

export type MarketingData = {
  products: MarketingProduct[];
  coupons: MarketingCoupon[];
  banners: MarketingBanner[];
  campaigns: MarketingCampaign[];
};

export type ActionResult<T = unknown> = {
  success: boolean;
  error?: string;
  data?: T;
};

function text(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
}

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function cleanDate(value: string | null | undefined) {
  if (!value || !value.trim()) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function revalidateMarketing() {
  revalidatePath("/admin/marketing");
  revalidatePath("/");
  revalidatePath("/shop");
}

export async function getMarketingData(): Promise<{
  success: boolean;
  data: MarketingData;
  error?: string;
}> {
  try {
    await requireAdmin();

    const supabase = await createClient();

    const [
      productsResult,
      couponsResult,
      bannersResult,
      campaignsResult,
    ] = await Promise.all([
      supabase
        .from("products")
        .select(
          "id,name,sku,price,sale_price,stock,featured,status,category_id"
        )
        .order("created_at", { ascending: false }),

      supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false }),

      supabase
        .from("banners")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),

      supabase
        .from("marketing_campaigns")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    const firstError =
      productsResult.error ||
      couponsResult.error ||
      bannersResult.error ||
      campaignsResult.error;

    if (firstError) {
      return {
        success: false,
        data: {
          products: [],
          coupons: [],
          banners: [],
          campaigns: [],
        },
        error: firstError.message,
      };
    }

    return {
      success: true,
      data: {
        products: ((productsResult.data ?? []) as Row[]).map((row) => ({
          id: text(row.id),
          name: text(row.name),
          sku: text(row.sku),
          price: numberValue(row.price),
          salePrice: nullableNumber(row.sale_price),
          stock: numberValue(row.stock),
          featured: Boolean(row.featured),
          status: text(row.status),
          categoryId: row.category_id
            ? text(row.category_id)
            : null,
        })),

        coupons: ((couponsResult.data ?? []) as Row[]).map((row) => ({
          id: text(row.id),
          code: text(row.code),
          description: text(row.description),
          discountType: text(row.discount_type),
          discountValue: numberValue(row.discount_value),
          minimumOrderAmount: nullableNumber(
            row.minimum_order_amount
          ),
          usageLimit:
            row.usage_limit === null ||
            row.usage_limit === undefined
              ? null
              : numberValue(row.usage_limit),
          usedCount: numberValue(row.used_count),
          expiresAt: row.expires_at
            ? text(row.expires_at)
            : null,
          isActive: Boolean(row.is_active),
          isExpired:
            Boolean(row.expires_at) &&
            new Date(text(row.expires_at)).getTime() <= Date.now(),
          createdAt: row.created_at
            ? text(row.created_at)
            : null,
        })),

        banners: ((bannersResult.data ?? []) as Row[]).map((row) => ({
          id: text(row.id),
          title: text(row.title),
          subtitle: text(row.subtitle),
          imageUrl: text(row.image_url),
          buttonText: text(row.button_text),
          buttonUrl: text(row.button_url),
          isActive: Boolean(row.is_active),
          sortOrder: numberValue(row.sort_order),
          createdAt: row.created_at
            ? text(row.created_at)
            : null,
        })),

        campaigns: ((campaignsResult.data ?? []) as Row[]).map(
          (row) => ({
            id: text(row.id),
            name: text(row.name),
            description: text(row.description),
            status: text(row.status),
            startsAt: row.starts_at
              ? text(row.starts_at)
              : null,
            endsAt: row.ends_at
              ? text(row.ends_at)
              : null,
            createdBy: row.created_by
              ? text(row.created_by)
              : null,
            createdAt: row.created_at
              ? text(row.created_at)
              : null,
          })
        ),
      },
    };
  } catch (error) {
    return {
      success: false,
      data: {
        products: [],
        coupons: [],
        banners: [],
        campaigns: [],
      },
      error:
        error instanceof Error
          ? error.message
          : "Unable to load marketing data.",
    };
  }
}

export async function createCoupon(input: {
  code: string;
  description: string;
  discountType: string;
  discountValue: number;
  minimumOrderAmount: number | null;
  usageLimit: number | null;
  expiresAt: string | null;
  isActive: boolean;
}): Promise<ActionResult> {
  try {
    await requireAdmin();

    const code = input.code.trim().toUpperCase();

    if (!code) {
      return {
        success: false,
        error: "Coupon code is required.",
      };
    }

    if (!["percentage", "fixed"].includes(input.discountType)) {
      return {
        success: false,
        error: "Invalid discount type.",
      };
    }

    if (
      !Number.isFinite(input.discountValue) ||
      input.discountValue <= 0
    ) {
      return {
        success: false,
        error: "Discount value must be greater than zero.",
      };
    }

    if (
      input.minimumOrderAmount !== null &&
      input.minimumOrderAmount < 0
    ) {
      return {
        success: false,
        error: "Minimum order amount cannot be negative.",
      };
    }

    if (input.usageLimit !== null && input.usageLimit < 1) {
      return {
        success: false,
        error: "Usage limit must be at least 1.",
      };
    }

    if (
      input.discountType === "percentage" &&
      input.discountValue > 100
    ) {
      return {
        success: false,
        error: "Percentage discount cannot exceed 100%.",
      };
    }

    const supabase = await createClient();

    const { error } = await supabase.from("coupons").insert({
      code,
      description:
        input.description.trim() || null,
      discount_type: input.discountType,
      discount_value: input.discountValue,
      minimum_order_amount: input.minimumOrderAmount,
      usage_limit: input.usageLimit,
      expires_at: cleanDate(input.expiresAt),
      is_active: input.isActive,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    revalidateMarketing();

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to create coupon.",
    };
  }
}

export async function updateCoupon(
  id: string,
  input: {
    code: string;
    description: string;
    discountType: string;
    discountValue: number;
    minimumOrderAmount: number | null;
    usageLimit: number | null;
    expiresAt: string | null;
    isActive: boolean;
  }
): Promise<ActionResult> {
  try {
    await requireAdmin();

    if (!id) {
      return {
        success: false,
        error: "Coupon ID is required.",
      };
    }

    const code = input.code.trim().toUpperCase();

    if (!code) {
      return {
        success: false,
        error: "Coupon code is required.",
      };
    }

    if (!["percentage", "fixed"].includes(input.discountType)) {
      return {
        success: false,
        error: "Invalid discount type.",
      };
    }

    if (
      !Number.isFinite(input.discountValue) ||
      input.discountValue <= 0
    ) {
      return {
        success: false,
        error: "Discount value must be greater than zero.",
      };
    }

    if (
      input.discountType === "percentage" &&
      input.discountValue > 100
    ) {
      return {
        success: false,
        error: "Percentage discount cannot exceed 100%.",
      };
    }

    if (input.usageLimit !== null && input.usageLimit < 1) {
      return {
        success: false,
        error: "Usage limit must be at least 1.",
      };
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("coupons")
      .update({
        code,
        description:
          input.description.trim() || null,
        discount_type: input.discountType,
        discount_value: input.discountValue,
        minimum_order_amount: input.minimumOrderAmount,
        usage_limit: input.usageLimit,
        expires_at: cleanDate(input.expiresAt),
        is_active: input.isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    revalidateMarketing();

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to update coupon.",
    };
  }
}

export async function deleteCoupon(
  id: string
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const supabase = await createClient();

    const { error } = await supabase
      .from("coupons")
      .delete()
      .eq("id", id);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    revalidateMarketing();

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to delete coupon.",
    };
  }
}

export async function toggleCoupon(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const supabase = await createClient();

    const { error } = await supabase
      .from("coupons")
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    revalidateMarketing();

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to change coupon status.",
    };
  }
}

export async function updateProductSalePrice(
  id: string,
  salePrice: number | null
): Promise<ActionResult> {
  try {
    await requireAdmin();

    if (!id) {
      return {
        success: false,
        error: "Product ID is required.",
      };
    }

    const supabase = await createClient();

    const { data: product, error: productError } =
      await supabase
        .from("products")
        .select("id,price")
        .eq("id", id)
        .maybeSingle();

    if (productError) {
      return {
        success: false,
        error: productError.message,
      };
    }

    if (!product) {
      return {
        success: false,
        error: "Product was not found.",
      };
    }

    if (salePrice !== null) {
      const price = Number(product.price);

      if (
        !Number.isFinite(salePrice) ||
        salePrice <= 0
      ) {
        return {
          success: false,
          error: "Sale price must be greater than zero.",
        };
      }

      if (
        Number.isFinite(price) &&
        salePrice >= price
      ) {
        return {
          success: false,
          error:
            "Sale price must be lower than the regular price.",
        };
      }
    }

    const { error } = await supabase
      .from("products")
      .update({
        sale_price: salePrice,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    revalidateMarketing();

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to update product discount.",
    };
  }
}

export async function toggleFeaturedProduct(
  id: string,
  featured: boolean
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const supabase = await createClient();

    const { error } = await supabase
      .from("products")
      .update({
        featured,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    revalidateMarketing();

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to change featured status.",
    };
  }
}

export async function createBanner(input: {
  title: string;
  subtitle: string;
  imageUrl: string;
  buttonText: string;
  buttonUrl: string;
  isActive: boolean;
  sortOrder: number;
}): Promise<ActionResult> {
  try {
    await requireAdmin();

    if (!input.title.trim()) {
      return {
        success: false,
        error: "Banner title is required.",
      };
    }

    if (!input.imageUrl.trim()) {
      return {
        success: false,
        error: "Banner image URL is required.",
      };
    }

    const supabase = await createClient();

    const { error } = await supabase.from("banners").insert({
      title: input.title.trim(),
      subtitle: input.subtitle.trim() || null,
      image_url: input.imageUrl.trim(),
      button_text: input.buttonText.trim() || null,
      button_url: input.buttonUrl.trim() || null,
      is_active: input.isActive,
      sort_order: Number.isFinite(input.sortOrder)
        ? input.sortOrder
        : 0,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    revalidateMarketing();

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to create banner.",
    };
  }
}

export async function updateBanner(
  id: string,
  input: {
    title: string;
    subtitle: string;
    imageUrl: string;
    buttonText: string;
    buttonUrl: string;
    isActive: boolean;
    sortOrder: number;
  }
): Promise<ActionResult> {
  try {
    await requireAdmin();

    if (!id) {
      return {
        success: false,
        error: "Banner ID is required.",
      };
    }

    if (!input.title.trim()) {
      return {
        success: false,
        error: "Banner title is required.",
      };
    }

    if (!input.imageUrl.trim()) {
      return {
        success: false,
        error: "Banner image URL is required.",
      };
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("banners")
      .update({
        title: input.title.trim(),
        subtitle: input.subtitle.trim() || null,
        image_url: input.imageUrl.trim(),
        button_text: input.buttonText.trim() || null,
        button_url: input.buttonUrl.trim() || null,
        is_active: input.isActive,
        sort_order: Number.isFinite(input.sortOrder)
          ? input.sortOrder
          : 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    revalidateMarketing();

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to update banner.",
    };
  }
}

export async function deleteBanner(
  id: string
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const supabase = await createClient();

    const { error } = await supabase
      .from("banners")
      .delete()
      .eq("id", id);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    revalidateMarketing();

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to delete banner.",
    };
  }
}

export async function toggleBanner(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const supabase = await createClient();

    const { error } = await supabase
      .from("banners")
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    revalidateMarketing();

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to change banner status.",
    };
  }
}

export async function createCampaign(input: {
  name: string;
  description: string;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
}): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();

    if (!input.name.trim()) {
      return {
        success: false,
        error: "Campaign name is required.",
      };
    }

    const allowedStatuses = [
      "draft",
      "scheduled",
      "active",
      "ended",
    ];

    if (!allowedStatuses.includes(input.status)) {
      return {
        success: false,
        error: "Invalid campaign status.",
      };
    }

    const startsAt = cleanDate(input.startsAt);
    const endsAt = cleanDate(input.endsAt);

    if (
      startsAt &&
      endsAt &&
      new Date(endsAt) < new Date(startsAt)
    ) {
      return {
        success: false,
        error:
          "Campaign end time cannot be earlier than the start time.",
      };
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("marketing_campaigns")
      .insert({
        name: input.name.trim(),
        description:
          input.description.trim() || null,
        status: input.status,
        starts_at: startsAt,
        ends_at: endsAt,
        created_by: admin.userId,
      });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    revalidateMarketing();

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to create campaign.",
    };
  }
}

export async function updateCampaign(
  id: string,
  input: {
    name: string;
    description: string;
    status: string;
    startsAt: string | null;
    endsAt: string | null;
  }
): Promise<ActionResult> {
  try {
    await requireAdmin();

    if (!id) {
      return {
        success: false,
        error: "Campaign ID is required.",
      };
    }

    if (!input.name.trim()) {
      return {
        success: false,
        error: "Campaign name is required.",
      };
    }

    const allowedStatuses = [
      "draft",
      "scheduled",
      "active",
      "ended",
    ];

    if (!allowedStatuses.includes(input.status)) {
      return {
        success: false,
        error: "Invalid campaign status.",
      };
    }

    const startsAt = cleanDate(input.startsAt);
    const endsAt = cleanDate(input.endsAt);

    if (
      startsAt &&
      endsAt &&
      new Date(endsAt) < new Date(startsAt)
    ) {
      return {
        success: false,
        error:
          "Campaign end time cannot be earlier than the start time.",
      };
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("marketing_campaigns")
      .update({
        name: input.name.trim(),
        description:
          input.description.trim() || null,
        status: input.status,
        starts_at: startsAt,
        ends_at: endsAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    revalidateMarketing();

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to update campaign.",
    };
  }
}

export async function deleteCampaign(
  id: string
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const supabase = await createClient();

    const { error } = await supabase
      .from("marketing_campaigns")
      .delete()
      .eq("id", id);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    revalidateMarketing();

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to delete campaign.",
    };
  }
}