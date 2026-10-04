export const MUHAJ_CHECKOUT_KEY = "muhaj-checkout";

export type CheckoutCartItem = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image_url: string | null;
  quantity: number;
};

export type CheckoutData = {
  customer: {
    full_name: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    notes: string;
  };
  shipping_method_id: string;
  shipping_method_name: string;
  shipping_fee: number;
  subtotal: number;
  total: number;
  items: CheckoutCartItem[];
  saved_at?: string;
};

export function saveCheckoutData(data: CheckoutData) {
  if (typeof window === "undefined") {
    return;
  }

  const payload = JSON.stringify({
    ...data,
    saved_at: new Date().toISOString(),
  });

  try {
    window.localStorage.setItem(MUHAJ_CHECKOUT_KEY, payload);
  } catch {
    // Continue to sessionStorage fallback.
  }

  try {
    window.sessionStorage.setItem(MUHAJ_CHECKOUT_KEY, payload);
  } catch {
    // localStorage remains the primary fallback.
  }
}

export function readCheckoutData(): CheckoutData | null {
  if (typeof window === "undefined") {
    return null;
  }

  const sources = [
    window.localStorage,
    window.sessionStorage,
  ];

  for (const storage of sources) {
    try {
      const raw = storage.getItem(MUHAJ_CHECKOUT_KEY);

      if (!raw) {
        continue;
      }

      const parsed = JSON.parse(raw);

      if (
        parsed &&
        parsed.customer &&
        Array.isArray(parsed.items) &&
        typeof parsed.shipping_fee === "number" &&
        typeof parsed.subtotal === "number" &&
        typeof parsed.total === "number"
      ) {
        return parsed as CheckoutData;
      }
    } catch {
      // Try the next storage source.
    }
  }

  return null;
}

export function clearCheckoutData() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(MUHAJ_CHECKOUT_KEY);
  } catch {
    // Ignore storage cleanup errors.
  }

  try {
    window.sessionStorage.removeItem(MUHAJ_CHECKOUT_KEY);
  } catch {
    // Ignore storage cleanup errors.
  }
}