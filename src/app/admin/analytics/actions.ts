"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type Row = Record<string, unknown>;

function value(row: Row, keys: string[]) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
      return row[key];
    }
  }
  return null;
}

function supabaseConfig() {
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

async function getSupabase() {
  const cookieStore = await cookies();
  const { url, key } = supabaseConfig();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(items) {
        try {
          items.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {}
      },
    },
  });
}

export type AnalyticsData = {
  revenue: number;
  orders: number;
  customers: number;
  products: number;
  unitsSold: number;

  salesSeries: {
    label: string;
    revenue: number;
    orders: number;
  }[];

  orderStatuses: {
    status: string;
    count: number;
  }[];

  topProducts: {
    name: string;
    units: number;
    revenue: number;
  }[];

  recentActivity: {
    id: string;
    type: "order" | "payment";
    title: string;
    amount: number;
    status: string;
    createdAt: string | null;
  }[];
};

function moneyNumber(input: unknown) {
  if (typeof input === "number") return input;

  return (
    Number(String(input ?? "0").replace(/,/g, "").replace(/[^\d.-]/g, "")) ||
    0
  );
}

function normalStatus(input: unknown) {
  return String(input ?? "").trim().toLowerCase();
}

function customerName(profile?: Row) {
  if (!profile) return "Customer";

  const full = value(profile, [
    "full_name",
    "name",
    "display_name",
    "username",
  ]);

  if (full) return String(full);

  const first = value(profile, ["first_name", "firstname"]);
  const last = value(profile, ["last_name", "lastname"]);

  return [first, last].filter(Boolean).join(" ").trim() || "Customer";
}

function orderDate(row: Row) {
  const raw = value(row, [
    "created_at",
    "createdAt",
    "ordered_at",
    "order_date",
  ]);

  if (!raw) return null;

  const date = new Date(String(raw));
  return Number.isNaN(date.getTime()) ? null : date;
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dayLabel(date: Date) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function isCancelled(status: string) {
  return [
    "cancelled",
    "canceled",
    "refunded",
  ].includes(status);
}

export async function getAnalytics(days = 30): Promise<{
  success: boolean;
  data: AnalyticsData | null;
  error?: string;
}> {
  try {
    const db = await getSupabase();

    const [
      { data: orders, error: ordersError },
      { data: payments, error: paymentsError },
      { data: orderItems, error: itemsError },
      { data: products },
      { data: profiles },
    ] = await Promise.all([
      db.from("orders").select("*"),
      db.from("payments").select("*"),
      db.from("order_items").select("*"),
      db.from("products").select("*"),
      db.from("profiles").select("*"),
    ]);

    if (ordersError) {
      return {
        success: false,
        data: null,
        error: ordersError.message,
      };
    }

    if (paymentsError) {
      return {
        success: false,
        data: null,
        error: paymentsError.message,
      };
    }

    if (itemsError) {
      return {
        success: false,
        data: null,
        error: itemsError.message,
      };
    }

    const orderRows = (orders ?? []) as Row[];
    const paymentRows = (payments ?? []) as Row[];
    const itemRows = (orderItems ?? []) as Row[];
    const productRows = (products ?? []) as Row[];
    const profileRows = (profiles ?? []) as Row[];

    const orderMap = new Map<string, Row>();

    for (const order of orderRows) {
      const id = value(order, ["id", "order_id"]);
      if (id) {
        orderMap.set(String(id), order);
      }
    }

    const productMap = new Map<string, Row>();

    for (const product of productRows) {
      const id = value(product, ["id", "product_id"]);
      if (id) {
        productMap.set(String(id), product);
      }
    }

    const profileIds = new Set<string>();

    for (const profile of profileRows) {
      const role = normalStatus(value(profile, ["role"]));

      if (role !== "admin" && role !== "super_admin") {
        const id = value(profile, ["id", "user_id", "profile_id"]);
        if (id) {
          profileIds.add(String(id));
        }
      }
    }

    const revenue = paymentRows
      .filter((payment) => normalStatus(value(payment, ["status", "payment_status"])) === "paid")
      .reduce((sum, payment) => {
        return sum + moneyNumber(
          value(payment, ["amount", "paid_amount", "total"])
        );
      }, 0)
      -
      paymentRows
        .filter((payment) => normalStatus(value(payment, ["status", "payment_status"])) === "refunded")
        .reduce((sum, payment) => {
          return sum + moneyNumber(
            value(payment, ["amount", "paid_amount", "total"])
          );
        }, 0);

    const customerCount = profileIds.size;

    const salesStart = new Date();
    salesStart.setDate(salesStart.getDate() - (days - 1));
    salesStart.setHours(0, 0, 0, 0);

    const salesMap = new Map<
      string,
      { label: string; revenue: number; orders: number }
    >();

    for (let i = 0; i < days; i++) {
      const current = new Date(salesStart);
      current.setDate(salesStart.getDate() + i);

      salesMap.set(dayKey(current), {
        label: dayLabel(current),
        revenue: 0,
        orders: 0,
      });
    }

    for (const payment of paymentRows) {
      const status = normalStatus(
        value(payment, ["status", "payment_status"])
      );

      if (status !== "paid") continue;

      const rawDate = value(payment, [
        "created_at",
        "createdAt",
        "paid_at",
      ]);

      if (!rawDate) continue;

      const created = new Date(String(rawDate));

      if (Number.isNaN(created.getTime())) continue;

      created.setHours(0, 0, 0, 0);

      const key = dayKey(created);
      const point = salesMap.get(key);

      if (point) {
        point.revenue += moneyNumber(
          value(payment, ["amount", "paid_amount", "total"])
        );
      }
    }

    for (const order of orderRows) {
      const status = normalStatus(
        value(order, ["status", "order_status"])
      );

      if (isCancelled(status)) continue;

      const created = orderDate(order);

      if (!created) continue;

      created.setHours(0, 0, 0, 0);

      const point = salesMap.get(dayKey(created));

      if (point) {
        point.orders += 1;

        const linkedPayments = paymentRows.filter((payment) => {
          const paymentOrderId = value(payment, [
            "order_id",
            "orderId",
          ]);

          const orderId = value(order, ["id", "order_id"]);

          return (
            paymentOrderId &&
            orderId &&
            String(paymentOrderId) === String(orderId)
          );
        });

        if (
          linkedPayments.length === 0 &&
          point.revenue === 0
        ) {
          const orderTotal = moneyNumber(
            value(order, [
              "total",
              "total_amount",
              "amount",
              "grand_total",
            ])
          );

          if (orderTotal > 0) {
            point.revenue += 0;
          }
        }
      }
    }

    const productSales = new Map<
      string,
      { name: string; units: number; revenue: number }
    >();

    let unitsSold = 0;

    for (const item of itemRows) {
      const rawOrderId = value(item, [
        "order_id",
        "orderId",
      ]);

      const order = rawOrderId
        ? orderMap.get(String(rawOrderId))
        : undefined;

      if (!order) continue;

      const orderStatus = normalStatus(
        value(order, ["status", "order_status"])
      );

      if (isCancelled(orderStatus)) continue;

      const productId = value(item, [
        "product_id",
        "productId",
      ]);

      const product = productId
        ? productMap.get(String(productId))
        : undefined;

      const name = String(
        value(item, [
          "product_name",
          "name",
          "title",
        ]) ??
          value(product ?? {}, [
            "name",
            "title",
          ]) ??
          "Product"
      );

      const quantity =
        moneyNumber(
          value(item, [
            "quantity",
            "qty",
            "units",
          ])
        ) || 1;

      const unitPrice = moneyNumber(
        value(item, [
          "unit_price",
          "price",
          "amount",
        ])
      );

      const lineTotal =
        moneyNumber(
          value(item, [
            "subtotal",
            "total",
            "line_total",
          ])
        ) ||
        unitPrice * quantity;

      const current = productSales.get(name) ?? {
        name,
        units: 0,
        revenue: 0,
      };

      current.units += quantity;
      current.revenue += lineTotal;

      productSales.set(name, current);
      unitsSold += quantity;
    }

    const topProducts = Array.from(productSales.values())
      .sort((a, b) => {
        if (b.units !== a.units) {
          return b.units - a.units;
        }

        return b.revenue - a.revenue;
      })
      .slice(0, 5);

    const statusMap = new Map<string, number>();

    for (const order of orderRows) {
      const status = normalStatus(
        value(order, ["status", "order_status"])
      ) || "pending";

      statusMap.set(
        status,
        (statusMap.get(status) ?? 0) + 1
      );
    }

    const orderStatuses = Array.from(statusMap.entries())
      .map(([status, count]) => ({
        status,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    const recentOrderActivity = orderRows
      .map((order) => {
        const id = value(order, ["id", "order_id"]);
        const date = orderDate(order);
        const status =
          normalStatus(
            value(order, ["status", "order_status"])
          ) || "pending";

        const rawCustomerId = value(order, [
          "user_id",
          "customer_id",
          "profile_id",
        ]);

        const profile = rawCustomerId
          ? profileRows.find((item) => {
              const idValue = value(item, [
                "id",
                "user_id",
                "profile_id",
              ]);

              return (
                idValue &&
                String(idValue) === String(rawCustomerId)
              );
            })
          : undefined;

        return {
          id: id ? String(id) : crypto.randomUUID(),
          type: "order" as const,
          title: `Order from ${customerName(profile)}`,
          amount: moneyNumber(
            value(order, [
              "total",
              "total_amount",
              "amount",
              "grand_total",
            ])
          ),
          status,
          createdAt: date ? date.toISOString() : null,
          time: date?.getTime() ?? 0,
        };
      })
      .sort((a, b) => b.time - a.time)
      .slice(0, 6);

    const recentPayments = paymentRows
      .map((payment) => {
        const id = value(payment, ["id", "payment_id"]);
        const dateRaw = value(payment, [
          "created_at",
          "createdAt",
          "paid_at",
        ]);

        const date = dateRaw ? new Date(String(dateRaw)) : null;

        return {
          id: id ? String(id) : crypto.randomUUID(),
          type: "payment" as const,
          title: "Payment received",
          amount: moneyNumber(
            value(payment, [
              "amount",
              "paid_amount",
              "total",
            ])
          ),
          status:
            normalStatus(
              value(payment, ["status", "payment_status"])
            ) || "pending",
          createdAt:
            date && !Number.isNaN(date.getTime())
              ? date.toISOString()
              : null,
          time:
            date && !Number.isNaN(date.getTime())
              ? date.getTime()
              : 0,
        };
      })
      .filter(
        (item) =>
          item.status === "paid" ||
          item.status === "refunded"
      )
      .sort((a, b) => b.time - a.time)
      .slice(0, 6);

    const recentActivity = [
      ...recentOrderActivity,
      ...recentPayments,
    ]
      .sort((a, b) => b.time - a.time)
      .slice(0, 8)
      .map(({ time: _time, ...item }) => item);

    return {
      success: true,
      data: {
        revenue: Math.max(0, revenue),
        orders: orderRows.length,
        customers: customerCount,
        products: productRows.length,
        unitsSold,
        salesSeries: Array.from(salesMap.values()),
        orderStatuses,
        topProducts,
        recentActivity,
      },
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load analytics.",
    };
  }
}