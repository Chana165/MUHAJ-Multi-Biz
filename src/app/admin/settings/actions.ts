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

function text(value: unknown) {
  return value === null || value === undefined
    ? ""
    : String(value);
}

export type StoreSettings = {
  id: string;
  storeName: string;
  tagline: string;
  description: string;
  phone: string;
  email: string;
  whatsapp: string;
  address: string;
  city: string;
  state: string;
  country: string;
  logoUrl: string;
  faviconUrl: string;
  currency: string;
  updatedAt: string | null;
};

function mapSettings(row: Row): StoreSettings {
  return {
    id: text(row.id),
    storeName: text(row.store_name),
    tagline: text(row.tagline),
    description: text(row.description),
    phone: text(row.phone),
    email: text(row.email),
    whatsapp: text(row.whatsapp),
    address: text(row.address),
    city: text(row.city),
    state: text(row.state),
    country: text(row.country),
    logoUrl: text(row.logo_url),
    faviconUrl: text(row.favicon_url),
    currency: text(row.currency) || "NGN",
    updatedAt: row.updated_at
      ? String(row.updated_at)
      : null,
  };
}

export async function getStoreSettings() {
  try {
    const client = await db();

    const { data, error } = await client
      .from("store_settings")
      .select("*")
      .order("updated_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (error) {
      return {
        success: false,
        settings: null,
        error: error.message,
      };
    }

    if (!data) {
      return {
        success: true,
        settings: null,
      };
    }

    return {
      success: true,
      settings: mapSettings(data as Row),
    };
  } catch (error) {
    return {
      success: false,
      settings: null,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load store settings.",
    };
  }
}

type SettingsInput = {
  storeName: string;
  tagline: string;
  description: string;
  phone: string;
  email: string;
  whatsapp: string;
  address: string;
  city: string;
  state: string;
  country: string;
  logoUrl: string;
  faviconUrl: string;
  currency: string;
};

function cleanInput(input: SettingsInput) {
  return {
    store_name: input.storeName.trim(),
    tagline: input.tagline.trim() || null,
    description: input.description.trim() || null,
    phone: input.phone.trim() || null,
    email: input.email.trim() || null,
    whatsapp: input.whatsapp.trim() || null,
    address: input.address.trim() || null,
    city: input.city.trim() || null,
    state: input.state.trim() || null,
    country: input.country.trim() || null,
    logo_url: input.logoUrl.trim() || null,
    favicon_url: input.faviconUrl.trim() || null,
    currency:
      input.currency.trim().toUpperCase() || "NGN",
    updated_at: new Date().toISOString(),
  };
}

export async function updateStoreSettings(
  id: string | null,
  input: SettingsInput
) {
  if (!input.storeName.trim()) {
    return {
      success: false,
      error: "Store name is required.",
    };
  }

  try {
    const client = await db();
    const payload = cleanInput(input);

    if (id) {
      const { data, error } = await client
        .from("store_settings")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      revalidatePath("/admin/settings");
      revalidatePath("/");
      revalidatePath("/shop");
      revalidatePath("/products/[slug]");

      return {
        success: true,
        settings: mapSettings(data as Row),
      };
    }

    const { data, error } = await client
      .from("store_settings")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    revalidatePath("/admin/settings");
    revalidatePath("/");
    revalidatePath("/shop");

    return {
      success: true,
      settings: mapSettings(data as Row),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to save store settings.",
    };
  }
}