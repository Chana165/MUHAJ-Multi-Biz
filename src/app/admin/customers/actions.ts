"use server";

import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/supabase/require-admin";

type Row = Record<string, unknown>;

type CustomerOrder = {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string | null;
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  isGuest: boolean;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
  lastOrderNumber: string;
  lastOrderStatus: string;
  orders: CustomerOrder[];
};

function getServiceClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL;

  const secretKey =
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "Server Supabase configuration is missing."
    );
  }

  return createSupabaseAdminClient(
    url,
    secretKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

function value(
  row: Row | undefined,
  keys: string[]
) {
  if (!row) {
    return undefined;
  }

  for (const key of keys) {
    const item = row[key];

    if (
      item !== null &&
      item !== undefined &&
      String(item).trim() !== ""
    ) {
      return item;
    }
  }

  return undefined;
}

function text(
  row: Row | undefined,
  keys: string[],
  fallback = ""
) {
  const item = value(row, keys);

  return item === undefined
    ? fallback
    : String(item).trim();
}

function numberValue(
  row: Row | undefined,
  keys: string[]
) {
  const item = value(row, keys);

  if (
    item === undefined ||
    item === null ||
    item === ""
  ) {
    return 0;
  }

  const parsed = Number(
    String(item).replace(/,/g, "")
  );

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function normalizeEmail(
  email: string
) {
  return email.trim().toLowerCase();
}

function normalizePhone(
  phone: string
) {
  return phone
    .replace(/[^\d+]/g, "")
    .replace(/^0+/, "0");
}

function validEmail(
  email: string
) {
  return (
    email.includes("@") &&
    email.includes(".")
  );
}

function orderCreatedAt(row: Row) {
  const raw = value(row, [
    "created_at",
    "createdAt",
    "order_date",
    "orderDate",
    "placed_at",
    "placedAt",
  ]);

  return raw
    ? String(raw)
    : null;
}

function orderStatus(row: Row) {
  return text(
    row,
    [
      "status",
      "order_status",
      "orderStatus",
    ],
    "pending"
  ).toLowerCase();
}

function orderNumber(row: Row) {
  return text(
    row,
    [
      "order_number",
      "orderNumber",
      "order_no",
      "orderNo",
    ],
    ""
  );
}

function orderId(row: Row) {
  return text(
    row,
    ["id", "order_id", "orderId"],
    ""
  );
}

function customerIdFromOrder(
  row: Row
) {
  return text(
    row,
    [
      "customer_id",
      "customerId",
      "user_id",
      "userId",
      "profile_id",
      "profileId",
    ],
    ""
  );
}

function customerEmailFromOrder(
  row: Row
) {
  return normalizeEmail(
    text(
      row,
      [
        "customer_email",
        "customerEmail",
        "email",
        "email_address",
        "emailAddress",
      ],
      ""
    )
  );
}

function customerPhoneFromOrder(
  row: Row
) {
  return text(
    row,
    [
      "customer_phone",
      "customerPhone",
      "phone",
      "phone_number",
      "phoneNumber",
      "mobile",
    ],
    ""
  );
}

function customerNameFromOrder(
  row: Row
) {
  return text(
    row,
    [
      "customer_name",
      "customerName",
      "full_name",
      "fullName",
      "name",
    ],
    "Guest Customer"
  );
}

function isCancelledOrder(
  row: Row
) {
  const status = orderStatus(row);

  return [
    "cancelled",
    "canceled",
    "refunded",
  ].includes(status);
}

function sortNewest(
  a: Row,
  b: Row
) {
  const aDate =
    orderCreatedAt(a);

  const bDate =
    orderCreatedAt(b);

  const aTime = aDate
    ? new Date(aDate).getTime()
    : 0;

  const bTime = bDate
    ? new Date(bDate).getTime()
    : 0;

  return bTime - aTime;
}

function chooseOrderNumber(
  row: Row
) {
  const number = orderNumber(row);

  if (number) {
    return number;
  }

  return "";
}

export async function getCustomers() {
  await requireAdmin();

  try {
    const admin = getServiceClient();

    const [
      authResult,
      profilesResult,
      ordersResult,
      addressesResult,
    ] = await Promise.all([
      admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      }),

      admin
        .from("profiles")
        .select("*"),

      admin
        .from("orders")
        .select("*"),

      admin
        .from("addresses")
        .select("*"),
    ]);

    if (authResult.error) {
      throw new Error(
        authResult.error.message
      );
    }

    if (profilesResult.error) {
      throw new Error(
        profilesResult.error.message
      );
    }

    if (ordersResult.error) {
      throw new Error(
        ordersResult.error.message
      );
    }

    const authUsers =
      authResult.data?.users ?? [];

    const profiles =
      (profilesResult.data ?? []) as Row[];

    const orders =
      (ordersResult.data ?? []) as Row[];

    const addresses =
      (addressesResult.data ?? []) as Row[];

    const profileMap =
      new Map<string, Row>();

    const emailToProfile =
      new Map<string, string>();

    const phoneToProfile =
      new Map<string, string>();

    for (const profile of profiles) {
      const id = text(
        profile,
        ["id", "user_id", "userId"],
        ""
      );

      if (!id) {
        continue;
      }

      const role = text(
        profile,
        ["role"],
        ""
      ).toLowerCase();

      if (
        role === "admin" ||
        role === "super_admin"
      ) {
        continue;
      }

      profileMap.set(id, profile);

      const profileEmail =
        normalizeEmail(
          text(
            profile,
            [
              "email",
              "customer_email",
            ],
            ""
          )
        );

      if (
        profileEmail &&
        validEmail(profileEmail)
      ) {
        emailToProfile.set(
          profileEmail,
          id
        );
      }

      const profilePhone =
        normalizePhone(
          text(
            profile,
            [
              "phone",
              "phone_number",
              "mobile",
              "whatsapp",
            ],
            ""
          )
        );

      if (profilePhone) {
        phoneToProfile.set(
          profilePhone,
          id
        );
      }
    }

    const authById =
      new Map<string, string>();

    for (const user of authUsers) {
      if (user.email) {
        authById.set(
          user.id,
          user.email
        );
      }
    }

    const addressByProfile =
      new Map<string, Row>();

    for (const address of addresses) {
      const ownerId =
        text(
          address,
          [
            "user_id",
            "userId",
            "profile_id",
            "profileId",
            "customer_id",
            "customerId",
          ],
          ""
        );

      if (!ownerId) {
        continue;
      }

      const isDefault =
        Boolean(
          value(address, [
            "is_default",
            "isDefault",
          ])
        );

      if (
        isDefault ||
        !addressByProfile.has(ownerId)
      ) {
        addressByProfile.set(
          ownerId,
          address
        );
      }
    }

    type CustomerBucket = {
      key: string;
      profileId: string;
      name: string;
      email: string;
      phone: string;
      city: string;
      state: string;
      isGuest: boolean;
      orderRows: Row[];
    };

    const buckets =
      new Map<string, CustomerBucket>();

    function ensureBucket(
      key: string,
      profileId: string,
      initial: Partial<CustomerBucket>
    ) {
      let bucket =
        buckets.get(key);

      if (!bucket) {
        bucket = {
          key,
          profileId,
          name:
            initial.name ||
            "Guest Customer",
          email:
            initial.email || "",
          phone:
            initial.phone || "",
          city:
            initial.city || "",
          state:
            initial.state || "",
          isGuest:
            initial.isGuest ?? true,
          orderRows: [],
        };

        buckets.set(
          key,
          bucket
        );
      }

      if (
        initial.name &&
        (!bucket.name ||
          bucket.name === "Guest Customer")
      ) {
        bucket.name =
          initial.name;
      }

      if (
        initial.email &&
        !bucket.email
      ) {
        bucket.email =
          initial.email;
      }

      if (
        initial.phone &&
        !bucket.phone
      ) {
        bucket.phone =
          initial.phone;
      }

      if (
        initial.city &&
        !bucket.city
      ) {
        bucket.city =
          initial.city;
      }

      if (
        initial.state &&
        !bucket.state
      ) {
        bucket.state =
          initial.state;
      }

      if (initial.isGuest === false) {
        bucket.isGuest = false;
      }

      return bucket;
    }

    // --------------------------------------------------------
    // Seed registered customer profiles
    // --------------------------------------------------------

    for (const profile of profileMap.values()) {
      const id = text(
        profile,
        ["id", "user_id", "userId"],
        ""
      );

      if (!id) {
        continue;
      }

      const email =
        authById.get(id) ??
        normalizeEmail(
          text(
            profile,
            [
              "email",
              "customer_email",
            ],
            ""
          )
        );

      const phone =
        text(
          profile,
          [
            "phone",
            "phone_number",
            "mobile",
            "whatsapp",
          ],
          ""
        );

      const displayName =
        text(
          profile,
          [
            "full_name",
            "fullName",
            "name",
            "display_name",
            "displayName",
          ],
          "Customer"
        );

      const address =
        addressByProfile.get(id);

      const city =
        text(
          profile,
          ["city"],
          ""
        ) ||
        text(
          address,
          ["city"],
          ""
        );

      const state =
        text(
          profile,
          ["state"],
          ""
        ) ||
        text(
          address,
          ["state"],
          ""
        );

      ensureBucket(
        `profile:${id}`,
        id,
        {
          profileId: id,
          name: displayName,
          email,
          phone,
          city,
          state,
          isGuest: false,
        }
      );
    }

    // --------------------------------------------------------
    // Merge every order into its real customer
    // --------------------------------------------------------

    const sortedOrders =
      [...orders].sort(
        sortNewest
      );

    for (const order of sortedOrders) {
      const explicitId =
        customerIdFromOrder(
          order
        );

      const email =
        customerEmailFromOrder(
          order
        );

      const phone =
        customerPhoneFromOrder(
          order
        );

      let profileId = "";

      if (
        explicitId &&
        profileMap.has(explicitId)
      ) {
        profileId =
          explicitId;
      } else if (
        email &&
        emailToProfile.has(email)
      ) {
        profileId =
          emailToProfile.get(email) ?? "";
      } else {
        const normalizedPhone =
          normalizePhone(phone);

        if (
          normalizedPhone &&
          phoneToProfile.has(
            normalizedPhone
          )
        ) {
          profileId =
            phoneToProfile.get(
              normalizedPhone
            ) ?? "";
        }
      }

      const profile =
        profileId
          ? profileMap.get(
              profileId
            )
          : undefined;

      const orderName =
        customerNameFromOrder(
          order
        );

      const orderPhone =
        customerPhoneFromOrder(
          order
        );

      const orderEmail =
        email;

      const profileName =
        profile
          ? text(
              profile,
              [
                "full_name",
                "fullName",
                "name",
                "display_name",
                "displayName",
              ],
              ""
            )
          : "";

      const profilePhone =
        profile
          ? text(
              profile,
              [
                "phone",
                "phone_number",
                "mobile",
                "whatsapp",
              ],
              ""
            )
          : "";

      const finalName =
        profileName ||
        (orderName !== "Guest Customer"
          ? orderName
          : "Guest Customer");

      const finalPhone =
        profilePhone ||
        orderPhone;

      const finalEmail =
        profile
          ? (
              authById.get(profileId) ??
              normalizeEmail(
                text(
                  profile,
                  [
                    "email",
                    "customer_email",
                  ],
                  ""
                )
              )
            )
          : orderEmail;

      const city =
        text(
          order,
          [
            "city",
            "customer_city",
            "customerCity",
          ],
          ""
        );

      const state =
        text(
          order,
          [
            "state",
            "customer_state",
            "customerState",
          ],
          ""
        );

      let key = "";

      if (profileId) {
        key =
          `profile:${profileId}`;
      } else if (orderEmail) {
        key =
          `email:${orderEmail}`;
      } else if (finalPhone) {
        key =
          `phone:${normalizePhone(
            finalPhone
          )}`;
      } else {
        key =
          `guest-order:${orderId(
            order
          )}`;
      }

      const bucket =
        ensureBucket(
          key,
          profileId,
          {
            profileId,
            name: finalName,
            email:
              finalEmail ||
              orderEmail,
            phone:
              finalPhone,
            city,
            state,
            isGuest:
              !profileId,
          }
        );

      bucket.orderRows.push(
        order
      );
    }

    const customers: Customer[] =
      Array.from(
        buckets.values()
      ).map((bucket) => {
        const rows =
          [...bucket.orderRows].sort(
            sortNewest
          );

        const customerOrders =
          rows.map((row) => ({
            id:
              orderId(row),
            orderNumber:
              chooseOrderNumber(
                row
              ) ||
              "Order",
            status:
              orderStatus(row),
            total:
              numberValue(
                row,
                [
                  "total_amount",
                  "grand_total",
                  "total",
                  "order_total",
                  "amount",
                ]
              ),
            createdAt:
              orderCreatedAt(row),
          }));

        const totalSpent =
          rows
            .filter(
              (row) =>
                !isCancelledOrder(
                  row
                )
            )
            .reduce(
              (
                total,
                row
              ) =>
                total +
                numberValue(
                  row,
                  [
                    "total_amount",
                    "grand_total",
                    "total",
                    "order_total",
                    "amount",
                  ]
                ),
              0
            );

        const latest =
          customerOrders[0];

        return {
          id:
            bucket.profileId ||
            bucket.key,
          name:
            bucket.name ||
            "Guest Customer",
          email:
            bucket.email,
          phone:
            bucket.phone,
          city:
            bucket.city,
          state:
            bucket.state,
          isGuest:
            bucket.isGuest,
          orderCount:
            customerOrders.length,
          totalSpent,
          lastOrderAt:
            latest?.createdAt ??
            null,
          lastOrderNumber:
            latest?.orderNumber ??
            "",
          lastOrderStatus:
            latest?.status ??
            "",
          orders:
            customerOrders,
        };
      });

    customers.sort(
      (a, b) => {
        const aTime =
          a.lastOrderAt
            ? new Date(
                a.lastOrderAt
              ).getTime()
            : 0;

        const bTime =
          b.lastOrderAt
            ? new Date(
                b.lastOrderAt
              ).getTime()
            : 0;

        return (
          bTime - aTime
        );
      }
    );

    const totalCustomers =
      customers.length;

    const registeredCustomers =
      customers.filter(
        (customer) =>
          !customer.isGuest
      ).length;

    const guestCustomers =
      customers.filter(
        (customer) =>
          customer.isGuest
      ).length;

    const repeatCustomers =
      customers.filter(
        (customer) =>
          customer.orderCount > 1
      ).length;

    const totalSpent =
      customers.reduce(
        (sum, customer) =>
          sum +
          customer.totalSpent,
        0
      );

    return {
      success: true,
      customers,
      stats: {
        totalCustomers,
        registeredCustomers,
        guestCustomers,
        repeatCustomers,
        totalSpent,
      },
    };
  } catch (error) {
    return {
      success: false,
      customers: [],
      stats: {
        totalCustomers: 0,
        registeredCustomers: 0,
        guestCustomers: 0,
        repeatCustomers: 0,
        totalSpent: 0,
      },
      error:
        error instanceof Error
          ? error.message
          : "Unable to load customers.",
    };
  }
}