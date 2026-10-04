import { requireAdmin } from "@/lib/supabase/require-admin";
import { createClient } from "@/lib/supabase/server";

import CustomerManager, {
  type AdminCustomer,
} from "./CustomerManager";

function firstString(
  source: Record<string, unknown>,
  keys: string[]
) {
  for (const key of keys) {
    const value = source[key];

    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return "";
}

function firstNumber(
  source: Record<string, unknown>,
  keys: string[]
) {
  for (const key of keys) {
    const value = source[key];

    if (
      typeof value === "number" &&
      Number.isFinite(value)
    ) {
      return value;
    }

    if (
      typeof value === "string" &&
      value.trim() &&
      Number.isFinite(Number(value))
    ) {
      return Number(value);
    }
  }

  return 0;
}

function formatAddress(value: unknown) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object") {
    const object = value as Record<string, unknown>;

    return [
      object.full_name,
      object.name,
      object.address,
      object.address_line_1,
      object.address_line_2,
      object.city,
      object.state,
      object.country,
      object.phone,
    ]
      .filter(
        (item) =>
          typeof item === "string" &&
          item.trim()
      )
      .join(", ");
  }

  return "";
}

export default async function CustomersPage() {
  await requireAdmin();

  const supabase = await createClient();

  const [
    { data: rawProfiles, error: profilesError },
    { data: rawOrders, error: ordersError },
    { data: rawAddresses, error: addressesError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("orders")
      .select("*")
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("addresses")
      .select("*")
      .order("created_at", {
        ascending: false,
      }),
  ]);

  if (profilesError) {
    throw new Error(
      profilesError.message ||
        "Unable to load customers."
    );
  }

  if (ordersError) {
    throw new Error(
      ordersError.message ||
        "Unable to load customer orders."
    );
  }

  if (addressesError) {
    throw new Error(
      addressesError.message ||
        "Unable to load customer addresses."
    );
  }

  const profiles =
    (rawProfiles ?? []) as Record<
      string,
      unknown
    >[];

  const orders =
    (rawOrders ?? []) as Record<
      string,
      unknown
    >[];

  const addresses =
    (rawAddresses ?? []) as Record<
      string,
      unknown
    >[];

  const orderStats = new Map<
    string,
    {
      orders: number;
      spent: number;
    }
  >();

  for (const order of orders) {
    const customerId =
      firstString(order, [
        "user_id",
        "customer_id",
        "profile_id",
      ]);

    if (!customerId) {
      continue;
    }

    const total = firstNumber(order, [
      "total_amount",
      "total",
      "grand_total",
      "amount",
    ]);

    const existing =
      orderStats.get(customerId) ?? {
        orders: 0,
        spent: 0,
      };

    existing.orders += 1;
    existing.spent += total;

    orderStats.set(
      customerId,
      existing
    );
  }

  const addressMap = new Map<
    string,
    string
  >();

  for (const address of addresses) {
    const customerId =
      firstString(address, [
        "user_id",
        "customer_id",
        "profile_id",
      ]);

    if (!customerId || addressMap.has(customerId)) {
      continue;
    }

    const formatted =
      formatAddress(address);

    if (formatted) {
      addressMap.set(
        customerId,
        formatted
      );
    }
  }

  const customers: AdminCustomer[] =
    profiles
      .filter(
        (profile) =>
          firstString(profile, [
            "role",
          ]).toLowerCase() !== "admin" &&
          firstString(profile, [
            "role",
          ]).toLowerCase() !== "super_admin"
      )
      .map((profile) => {
        const id =
          firstString(profile, [
            "id",
            "user_id",
          ]);

        const stats =
          orderStats.get(id) ?? {
            orders: 0,
            spent: 0,
          };

        const name =
          firstString(profile, [
            "full_name",
            "name",
            "display_name",
          ]) ||
          "Customer";

        const email =
          firstString(profile, [
            "email",
          ]);

        const phone =
          firstString(profile, [
            "phone",
            "phone_number",
          ]);

        const createdAt =
          firstString(profile, [
            "created_at",
          ]) ||
          new Date().toISOString();

        return {
          id,
          name,
          email,
          phone,
          role:
            firstString(profile, [
              "role",
            ]) || "customer",
          orders: stats.orders,
          spent: stats.spent,
          address:
            addressMap.get(id) ?? "",
          createdAt,
        };
      });

  return (
    <CustomerManager
      initialCustomers={customers}
    />
  );
}