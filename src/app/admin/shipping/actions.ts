"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { revalidatePath } from "next/cache";

type Row = Record<string, unknown>;

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

function stringValue(value: unknown) {
  return value === null || value === undefined
    ? ""
    : String(value);
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export type ShippingMethod = {
  id: string;
  name: string;
  description: string;
  zone: string;
  fee: number;
  freeShippingThreshold: number | null;
  estimatedDays: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string | null;
  updatedAt: string | null;
};

function mapMethod(row: Row): ShippingMethod {
  return {
    id: stringValue(row.id),
    name: stringValue(row.name),
    description: stringValue(row.description),
    zone: stringValue(row.zone),
    fee: numberValue(row.fee),
    freeShippingThreshold:
      row.free_shipping_threshold === null ||
      row.free_shipping_threshold === undefined
        ? null
        : numberValue(row.free_shipping_threshold),
    estimatedDays: stringValue(row.estimated_days),
    isActive: row.is_active !== false,
    sortOrder: numberValue(row.sort_order),
    createdAt: row.created_at
      ? String(row.created_at)
      : null,
    updatedAt: row.updated_at
      ? String(row.updated_at)
      : null,
  };
}

export async function getShippingMethods() {
  try {
    const client = await db();

    const { data, error } = await client
      .from("shipping_methods")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      return {
        success: false,
        methods: [],
        error: error.message,
      };
    }

    return {
      success: true,
      methods: ((data ?? []) as Row[]).map(mapMethod),
    };
  } catch (error) {
    return {
      success: false,
      methods: [],
      error:
        error instanceof Error
          ? error.message
          : "Unable to load shipping methods.",
    };
  }
}

type ShippingInput = {
  name: string;
  description: string;
  zone: string;
  fee: number;
  freeShippingThreshold: number | null;
  estimatedDays: string;
  isActive: boolean;
  sortOrder: number;
};

function cleanInput(input: ShippingInput) {
  return {
    name: input.name.trim(),
    description: input.description.trim() || null,
    zone: input.zone.trim() || "Nationwide Nigeria",
    fee: Math.max(0, Number(input.fee) || 0),
    free_shipping_threshold:
      input.freeShippingThreshold === null ||
      input.freeShippingThreshold === undefined ||
      Number.isNaN(Number(input.freeShippingThreshold))
        ? null
        : Math.max(
            0,
            Number(input.freeShippingThreshold)
          ),
    estimated_days:
      input.estimatedDays.trim() || null,
    is_active: Boolean(input.isActive),
    sort_order: Math.max(
      0,
      Math.floor(Number(input.sortOrder) || 0)
    ),
    updated_at: new Date().toISOString(),
  };
}

export async function createShippingMethod(
  input: ShippingInput
) {
  if (!input.name.trim()) {
    return {
      success: false,
      error: "Shipping method name is required.",
    };
  }

  try {
    const client = await db();

    const { data, error } = await client
      .from("shipping_methods")
      .insert(cleanInput(input))
      .select("*")
      .single();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    revalidatePath("/admin/shipping");
    revalidatePath("/checkout");

    return {
      success: true,
      method: mapMethod(data as Row),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to create shipping method.",
    };
  }
}

export async function updateShippingMethod(
  id: string,
  input: ShippingInput
) {
  if (!id || !input.name.trim()) {
    return {
      success: false,
      error: "Shipping method name is required.",
    };
  }

  try {
    const client = await db();

    const { data, error } = await client
      .from("shipping_methods")
      .update(cleanInput(input))
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    revalidatePath("/admin/shipping");
    revalidatePath("/checkout");

    return {
      success: true,
      method: mapMethod(data as Row),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to update shipping method.",
    };
  }
}

export async function deleteShippingMethod(id: string) {
  try {
    const client = await db();

    const { error } = await client
      .from("shipping_methods")
      .delete()
      .eq("id", id);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    revalidatePath("/admin/shipping");
    revalidatePath("/checkout");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to delete shipping method.",
    };
  }
}