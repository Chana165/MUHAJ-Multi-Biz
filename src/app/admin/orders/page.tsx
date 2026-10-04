import { requireAdmin } from "@/lib/supabase/require-admin";
import { createClient } from "@/lib/supabase/server";

import OrderManager, {
  type AdminOrder,
} from "./OrderManager";

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

function firstId(
  source: Record<string, unknown>,
  keys: string[]
) {
  return firstString(source, keys);
}

function formatAddress(
  value: unknown
) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object") {
    try {
      const object = value as Record<
        string,
        unknown
      >;

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
    } catch {
      return "";
    }
  }

  return "";
}

function normalizePaymentStatus(
  payment: Record<string, unknown> | null,
  order: Record<string, unknown>
) {
  const orderStatus = firstString(order, [
    "payment_status",
    "paymentStatus",
  ]);

  if (orderStatus) {
    return orderStatus;
  }

  if (payment) {
    const paymentStatus = firstString(
      payment,
      ["status", "payment_status"]
    );

    if (paymentStatus) {
      return paymentStatus;
    }
  }

  return "pending";
}

export default async function OrdersPage() {
  await requireAdmin();

  const supabase = await createClient();

  const [
    { data: rawOrders, error: ordersError },
    { data: rawItems, error: itemsError },
    { data: rawProfiles, error: profilesError },
    { data: rawPayments, error: paymentsError },
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("*")
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("order_items")
      .select("*"),

    supabase
      .from("profiles")
      .select("*"),

    supabase
      .from("payments")
      .select("*"),
  ]);

  if (ordersError) {
    throw new Error(
      ordersError.message ||
        "Unable to load orders."
    );
  }

  if (itemsError) {
    throw new Error(
      itemsError.message ||
        "Unable to load order items."
    );
  }

  if (profilesError) {
    throw new Error(
      profilesError.message ||
        "Unable to load customer profiles."
    );
  }

  if (paymentsError) {
    throw new Error(
      paymentsError.message ||
        "Unable to load payments."
    );
  }

  const orders = (rawOrders ?? []) as Record<
    string,
    unknown
  >[];

  const items = (rawItems ?? []) as Record<
    string,
    unknown
  >[];

  const profiles = (rawProfiles ?? []) as Record<
    string,
    unknown
  >[];

  const payments = (rawPayments ?? []) as Record<
    string,
    unknown
  >[];

  const profileMap = new Map<
    string,
    Record<string, unknown>
  >();

  for (const profile of profiles) {
    const id = firstId(profile, [
      "id",
      "user_id",
      "profile_id",
    ]);

    if (id) {
      profileMap.set(id, profile);
    }
  }

  const orderMap = new Map<
    string,
    Record<string, unknown>
  >();

  for (const order of orders) {
    const id = firstId(order, [
      "id",
      "order_id",
    ]);

    if (id) {
      orderMap.set(id, order);
    }
  }

  const paymentMap = new Map<
    string,
    Record<string, unknown>
  >();

  for (const payment of payments) {
    const orderId = firstId(payment, [
      "order_id",
      "orderId",
    ]);

    if (
      orderId &&
      !paymentMap.has(orderId)
    ) {
      paymentMap.set(orderId, payment);
    }
  }

  const itemMap = new Map<
    string,
    Record<string, unknown>[]
  >();

  for (const item of items) {
    const orderId = firstId(item, [
      "order_id",
      "orderId",
    ]);
if (!orderId) {
      continue;
    }

    const existing =
      itemMap.get(orderId) ?? [];

    existing.push(item);

    itemMap.set(orderId, existing);
  }

  const formattedOrders: AdminOrder[] =
    orders.map((order) => {
      const id = firstId(order, [
        "id",
        "order_id",
      ]);

      const customerId = firstId(order, [
        "user_id",
        "customer_id",
        "profile_id",
      ]) || null;

      const profile =
        customerId
          ? profileMap.get(customerId)
          : undefined;

      const itemsForOrder =
        itemMap.get(id) ?? [];

      const paymentRecord =
        paymentMap.get(id) ?? null;

      const orderTotal = firstNumber(
        order,
        [
          "total_amount",
          "total",
          "grand_total",
          "amount",
        ]
      );

      const subtotal = firstNumber(
        order,
        [
          "subtotal",
          "sub_total",
        ]
      );

      const orderItems =
        itemsForOrder.map(
          (item, index) => {
            const productId =
              firstId(item, [
                "product_id",
                "productId",
              ]) || null;

            const name =
              firstString(item, [
                "product_name",
                "name",
                "title",
              ]) ||
              (productId
                ? `Product ${productId.slice(
                    0,
                    8
                  )}`
                : `Item ${index + 1}`);

            const quantity = Math.max(
              1,
              Math.floor(
                firstNumber(item, [
                  "quantity",
                  "qty",
                ]) || 1
              )
            );

            const unitPrice =
              firstNumber(item, [
                "unit_price",
                "price",
                "unit_amount",
              ]);

            const calculatedTotal =
              unitPrice * quantity;

            const itemTotal =
              firstNumber(item, [
                "total",
                "line_total",
                "subtotal",
              ]) || calculatedTotal;

            return {
              id:
                firstId(item, [
                  "id",
                ]) ||
                `${id}-${index}`,
              orderId: id,
              productId,
              name,
              quantity,
              unitPrice,
              total: itemTotal,
              ...item,
            };
          }
        );

      const calculatedFromItems =
        orderItems.reduce(
          (total, item) =>
            total + item.total,
          0
        );

      const total =
        orderTotal ||
        subtotal ||
        calculatedFromItems;

      const profileName = profile
        ? firstString(profile, [
            "full_name",
            "name",
            "display_name",
          ])
        : "";

      const profileEmail = profile
        ? firstString(profile, [
            "email",
          ])
        : "";

      const profilePhone = profile
        ? firstString(profile, [
            "phone",
            "phone_number",
          ])
        : "";

      const customerName =
        firstString(order, [
          "customer_name",
          "customerName",
          "full_name",
          "name",
        ]) ||
        profileName ||
        "Customer";

      const customerEmail =
        firstString(order, [
          "customer_email",
          "customerEmail",
          "email",
        ]) ||
        profileEmail;

      const customerPhone =
        firstString(order, [
          "customer_phone",
          "customerPhone",
          "phone",
          "phone_number",
        ]) ||
        profilePhone;

      const shippingAddress =
        formatAddress(
          order.shipping_address ??
            order.delivery_address ??
            order.address
        );

      const status =
        firstString(order, [
          "status",
          "order_status",
        ]) || "pending";

      const paymentStatus =
        normalizePaymentStatus(
          paymentRecord,
          order
        );

      const createdAt =
        firstString(order, [
          "created_at",
          "createdAt",
        ]) ||
        new Date().toISOString();

      const payment =
        paymentRecord
          ? {
              orderId: id,
              status:
                firstString(
                  paymentRecord,
                  [
                    "status",
                    "payment_status",
                  ]
                ) || "pending",
              amount: firstNumber(
                paymentRecord,
                [
                  "amount",
                  "total_amount",
                ]
              ),
              ...paymentRecord,
            }
          : null;

      return {
        id,
        customerId,
        customerName,
        customerEmail,
        customerPhone,
        status: status.toLowerCase(),
        paymentStatus,
        total,
        subtotal,
        shippingAddress,
        createdAt,
        items: orderItems,
        payment,
        raw: order,
      };
    });

  return (
    <OrderManager
      initialOrders={formattedOrders}
    />
  );
}