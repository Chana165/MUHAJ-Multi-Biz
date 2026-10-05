"use client";

import {
  useState,
  useTransition,
  type FormEvent,
} from "react";
import {
  BarChart3,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Edit3,
  Image as ImageIcon,
  Megaphone,
  Percent,
  Plus,
  Save,
  Sparkles,
  Tag,
  Trash2,
  X,
} from "lucide-react";

import {
  createBanner,
  createCampaign,
  createCoupon,
  deleteBanner,
  deleteCampaign,
  deleteCoupon,
  toggleBanner,
  toggleCoupon,
  toggleFeaturedProduct,
  updateBanner,
  updateCampaign,
  updateCoupon,
  updateProductSalePrice,
  type MarketingBanner,
  type MarketingCampaign,
  type MarketingCoupon,
  type MarketingData,
  type MarketingProduct,
  type ActionResult,
} from "./actions";

type Props = {
  initialData: MarketingData;
  loadError?: string;
};

type Section =
  | "overview"
  | "coupons"
  | "discounts"
  | "featured"
  | "banners"
  | "campaigns";

type CouponForm = {
  id: string | null;
  code: string;
  description: string;
  discountType: "percentage" | "fixed";
  discountValue: string;
  minimumOrderAmount: string;
  usageLimit: string;
  expiresAt: string;
  isActive: boolean;
};

type BannerForm = {
  id: string | null;
  title: string;
  subtitle: string;
  imageUrl: string;
  buttonText: string;
  buttonUrl: string;
  isActive: boolean;
  sortOrder: string;
};

type CampaignForm = {
  id: string | null;
  name: string;
  description: string;
  status: "draft" | "scheduled" | "active" | "ended";
  startsAt: string;
  endsAt: string;
};

function money(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function date(value: string | null) {
  if (!value) return "—";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function localDateTime(value: string | null) {
  if (!value) return "";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const offset = parsed.getTimezoneOffset();
  const local = new Date(
    parsed.getTime() - offset * 60 * 1000
  );

  return local.toISOString().slice(0, 16);
}

function statusStyle(value: string) {
  switch (value.toLowerCase()) {
    case "active":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "scheduled":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "ended":
      return "border-slate-200 bg-slate-100 text-slate-600";
    case "draft":
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function statusLabel(value: string) {
  const normalized = value.toLowerCase();
  return (
    normalized.charAt(0).toUpperCase() +
    normalized.slice(1)
  );
}

function emptyCoupon(): CouponForm {
  return {
    id: null,
    code: "",
    description: "",
    discountType: "percentage",
    discountValue: "",
    minimumOrderAmount: "",
    usageLimit: "",
    expiresAt: "",
    isActive: true,
  };
}

function emptyBanner(): BannerForm {
  return {
    id: null,
    title: "",
    subtitle: "",
    imageUrl: "",
    buttonText: "",
    buttonUrl: "",
    isActive: true,
    sortOrder: "0",
  };
}

function emptyCampaign(): CampaignForm {
  return {
    id: null,
    name: "",
    description: "",
    status: "draft",
    startsAt: "",
    endsAt: "",
  };
}

function SectionIcon({ section }: { section: Section }) {
  if (section === "coupons") return <Tag className="h-4 w-4" />;
  if (section === "discounts") {
    return <Percent className="h-4 w-4" />;
  }
  if (section === "featured") {
    return <Sparkles className="h-4 w-4" />;
  }
  if (section === "banners") {
    return <ImageIcon className="h-4 w-4" />;
  }
  if (section === "campaigns") {
    return <Megaphone className="h-4 w-4" />;
  }
  return <BarChart3 className="h-4 w-4" />;
}

export default function MarketingManager({
  initialData,
  loadError,
}: Props) {
  const [section, setSection] =
    useState<Section>("overview");

  const [data] = useState<MarketingData>(initialData);

  const [couponForm, setCouponForm] =
    useState<CouponForm>(emptyCoupon());

  const [bannerForm, setBannerForm] =
    useState<BannerForm>(emptyBanner());

  const [campaignForm, setCampaignForm] =
    useState<CampaignForm>(emptyCampaign());

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] =
    useTransition();

  const activeCoupons = data.coupons.filter(
    (coupon) =>
      coupon.isActive &&
      !coupon.isExpired
  ).length;

  const saleProducts = data.products.filter(
    (product) =>
      product.salePrice !== null &&
      product.salePrice < product.price
  ).length;

  const featuredProducts = data.products.filter(
    (product) => product.featured
  ).length;

  const activeBanners = data.banners.filter(
    (banner) => banner.isActive
  ).length;

  const activeCampaigns = data.campaigns.filter(
    (campaign) =>
      campaign.status === "active" ||
      campaign.status === "scheduled"
  ).length;

  function feedback(
    result: ActionResult,
    successMessage: string
  ) {
    if (!result.success) {
      setError(result.error || "Unable to complete action.");
      setMessage("");
      return;
    }

    setError("");
    setMessage(successMessage);

    window.location.reload();
  }

  function runAction(
    actionName: string,
    action: () => Promise<ActionResult>,
    successMessage: string
  ) {
    setMessage("");
    setError("");

    startTransition(async () => {
      try {
        const result = await action();
        feedback(result, successMessage);
      } catch (actionError) {
        setError(
          actionError instanceof Error
            ? actionError.message
            : "Unable to complete action."
        );
        setMessage("");
      }
    });
  }

  function editCoupon(coupon: MarketingCoupon) {
    setCouponForm({
      id: coupon.id,
      code: coupon.code,
      description: coupon.description,
      discountType:
        coupon.discountType === "fixed"
          ? "fixed"
          : "percentage",
      discountValue: String(coupon.discountValue),
      minimumOrderAmount:
        coupon.minimumOrderAmount === null
          ? ""
          : String(coupon.minimumOrderAmount),
      usageLimit:
        coupon.usageLimit === null
          ? ""
          : String(coupon.usageLimit),
      expiresAt: localDateTime(coupon.expiresAt),
      isActive: coupon.isActive,
    });

    setSection("coupons");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function editBanner(banner: MarketingBanner) {
    setBannerForm({
      id: banner.id,
      title: banner.title,
      subtitle: banner.subtitle,
      imageUrl: banner.imageUrl,
      buttonText: banner.buttonText,
      buttonUrl: banner.buttonUrl,
      isActive: banner.isActive,
      sortOrder: String(banner.sortOrder),
    });

    setSection("banners");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function editCampaign(campaign: MarketingCampaign) {
    setCampaignForm({
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      status:
        campaign.status === "scheduled" ||
        campaign.status === "active" ||
        campaign.status === "ended"
          ? campaign.status
          : "draft",
      startsAt: localDateTime(campaign.startsAt),
      endsAt: localDateTime(campaign.endsAt),
    });

    setSection("campaigns");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCouponSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const discountValue = Number(
      couponForm.discountValue
    );

    const minimumOrderAmount =
      couponForm.minimumOrderAmount.trim()
        ? Number(couponForm.minimumOrderAmount)
        : null;

    const usageLimit =
      couponForm.usageLimit.trim()
        ? Number(couponForm.usageLimit)
        : null;

    if (!Number.isFinite(discountValue)) {
      setError("Enter a valid discount value.");
      return;
    }

    if (
      minimumOrderAmount !== null &&
      !Number.isFinite(minimumOrderAmount)
    ) {
      setError("Enter a valid minimum order amount.");
      return;
    }

    if (
      usageLimit !== null &&
      !Number.isInteger(usageLimit)
    ) {
      setError("Usage limit must be a whole number.");
      return;
    }

    const input = {
      code: couponForm.code,
      description: couponForm.description,
      discountType: couponForm.discountType,
      discountValue,
      minimumOrderAmount,
      usageLimit,
      expiresAt: couponForm.expiresAt || null,
      isActive: couponForm.isActive,
    };

    if (couponForm.id) {
      runAction(
        "update-coupon",
        () => updateCoupon(couponForm.id!, input),
        "Coupon updated successfully."
      );
    } else {
      runAction(
        "create-coupon",
        () => createCoupon(input),
        "Coupon created successfully."
      );
    }
  }

  function handleBannerSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const sortOrder = Number(
      bannerForm.sortOrder || "0"
    );

    if (!Number.isInteger(sortOrder)) {
      setError("Banner sort order must be a whole number.");
      return;
    }

    const input = {
      title: bannerForm.title,
      subtitle: bannerForm.subtitle,
      imageUrl: bannerForm.imageUrl,
      buttonText: bannerForm.buttonText,
      buttonUrl: bannerForm.buttonUrl,
      isActive: bannerForm.isActive,
      sortOrder,
    };

    if (bannerForm.id) {
      runAction(
        "update-banner",
        () => updateBanner(bannerForm.id!, input),
        "Banner updated successfully."
      );
    } else {
      runAction(
        "create-banner",
        () => createBanner(input),
        "Banner created successfully."
      );
    }
  }

  function handleCampaignSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const input = {
      name: campaignForm.name,
      description: campaignForm.description,
      status: campaignForm.status,
      startsAt: campaignForm.startsAt || null,
      endsAt: campaignForm.endsAt || null,
    };

    if (campaignForm.id) {
      runAction(
        "update-campaign",
        () => updateCampaign(campaignForm.id!, input),
        "Campaign updated successfully."
      );
    } else {
      runAction(
        "create-campaign",
        () => createCampaign(input),
        "Campaign created successfully."
      );
    }
  }

  function resetCoupon() {
    setCouponForm(emptyCoupon());
    setMessage("");
    setError("");
  }

  function resetBanner() {
    setBannerForm(emptyBanner());
    setMessage("");
    setError("");
  }

  function resetCampaign() {
    setCampaignForm(emptyCampaign());
    setMessage("");
    setError("");
  }

  function sectionTitle() {
    switch (section) {
      case "coupons":
        return "Coupons";
      case "discounts":
        return "Product Discounts";
      case "featured":
        return "Featured Products";
      case "banners":
        return "Homepage Banners";
      case "campaigns":
        return "Campaigns & Promotions";
      default:
        return "Marketing Overview";
    }
  }

  const navItems: {
    key: Section;
    label: string;
  }[] = [
    {
      key: "overview",
      label: "Overview",
    },
    {
      key: "coupons",
      label: "Coupons",
    },
    {
      key: "discounts",
      label: "Discounts",
    },
    {
      key: "featured",
      label: "Featured Products",
    },
    {
      key: "banners",
      label: "Homepage Banners",
    },
    {
      key: "campaigns",
      label: "Campaigns",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#b28b16]">
              Store Growth
            </p>

            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Marketing
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Manage discounts, coupons, featured products,
              homepage banners and promotional campaigns from one
              connected workspace.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
            <CircleDollarSign className="h-4 w-4 text-[#b28b16]" />
            <span>Currency</span>
            <span className="font-bold text-slate-900">
              NGN
            </span>
          </div>
        </div>

        {loadError && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {loadError}
          </div>
        )}

        {(message || error) && (
          <div
            className={`mb-6 rounded-2xl border p-4 text-sm ${
              error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {error || message}
          </div>
        )}

        <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:grid-cols-3 lg:grid-cols-6">
          {navItems.map((item) => {
            const active = section === item.key;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setSection(item.key);
                  setMessage("");
                  setError("");
                }}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition sm:text-sm ${
                  active
                    ? "bg-[#071a3a] text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <SectionIcon section={item.key} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {section !== "overview" && (
          <div className="mb-5 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                {sectionTitle()}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Live data from the MUHAJ Multi Biz database.
              </p>
            </div>

            <div className="hidden rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500 sm:block">
              {data.products.length +
                data.coupons.length +
                data.banners.length +
                data.campaigns.length}{" "}
              marketing records
            </div>
          </div>
        )}

        {section === "overview" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <SummaryCard
                icon={<Tag className="h-5 w-5" />}
                label="Active Coupons"
                value={String(activeCoupons)}
              />

              <SummaryCard
                icon={<Percent className="h-5 w-5" />}
                label="Products on Sale"
                value={String(saleProducts)}
              />

              <SummaryCard
                icon={<Sparkles className="h-5 w-5" />}
                label="Featured Products"
                value={String(featuredProducts)}
              />

              <SummaryCard
                icon={<ImageIcon className="h-5 w-5" />}
                label="Active Banners"
                value={String(activeBanners)}
              />

              <SummaryCard
                icon={<Megaphone className="h-5 w-5" />}
                label="Running Promotions"
                value={String(activeCampaigns)}
              />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <QuickActionCard
                icon={<Tag className="h-5 w-5" />}
                title="Coupons"
                description="Create and manage discount codes for customers."
                count={data.coupons.length}
                buttonLabel="Manage Coupons"
                onClick={() => setSection("coupons")}
              />

              <QuickActionCard
                icon={<Percent className="h-5 w-5" />}
                title="Discounts"
                description="Set or remove sale prices across products."
                count={saleProducts}
                buttonLabel="Manage Discounts"
                onClick={() => setSection("discounts")}
              />

              <QuickActionCard
                icon={<Sparkles className="h-5 w-5" />}
                title="Featured Products"
                description="Choose which products appear as featured items."
                count={featuredProducts}
                buttonLabel="Manage Featured"
                onClick={() => setSection("featured")}
              />

              <QuickActionCard
                icon={<ImageIcon className="h-5 w-5" />}
                title="Homepage Banners"
                description="Control promotional banners and calls to action."
                count={data.banners.length}
                buttonLabel="Manage Banners"
                onClick={() => setSection("banners")}
              />

              <div className="lg:col-span-2">
                <QuickActionCard
                  icon={<Megaphone className="h-5 w-5" />}
                  title="Campaigns & Promotions"
                  description="Plan and manage promotional campaigns with status and dates."
                  count={data.campaigns.length}
                  buttonLabel="Manage Campaigns"
                  onClick={() => setSection("campaigns")}
                />
              </div>
            </div>
          </>
        )}

        {section === "coupons" && (
          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#b28b16]">
                    {couponForm.id ? "Edit coupon" : "New coupon"}
                  </p>

                  <h3 className="mt-1 text-xl font-black text-slate-900">
                    {couponForm.id
                      ? "Update coupon"
                      : "Create a coupon"}
                  </h3>
                </div>

                {couponForm.id && (
                  <button
                    type="button"
                    onClick={resetCoupon}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    <X className="h-4 w-4" />
                    Cancel edit
                  </button>
                )}
              </div>

              <form
                onSubmit={handleCouponSubmit}
                className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
              >
                <Field
                  label="Coupon Code"
                  value={couponForm.code}
                  onChange={(value) =>
                    setCouponForm((current) => ({
                      ...current,
                      code: value.toUpperCase(),
                    }))
                  }
                  placeholder="WELCOME10"
                  required
                />

                <Field
                  label="Description"
                  value={couponForm.description}
                  onChange={(value) =>
                    setCouponForm((current) => ({
                      ...current,
                      description: value,
                    }))
                  }
                  placeholder="10% welcome discount"
                />

                <SelectField
                  label="Discount Type"
                  value={couponForm.discountType}
                  options={[
                    {
                      value: "percentage",
                      label: "Percentage",
                    },
                    {
                      value: "fixed",
                      label: "Fixed Amount",
                    },
                  ]}
                  onChange={(value) =>
                    setCouponForm((current) => ({
                      ...current,
                      discountType:
                        value as CouponForm["discountType"],
                    }))
                  }
                />

                <Field
                  label="Discount Value"
                  value={couponForm.discountValue}
                  onChange={(value) =>
                    setCouponForm((current) => ({
                      ...current,
                      discountValue: value,
                    }))
                  }
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="10"
                  required
                />

                <Field
                  label="Minimum Order"
                  value={couponForm.minimumOrderAmount}
                  onChange={(value) =>
                    setCouponForm((current) => ({
                      ...current,
                      minimumOrderAmount: value,
                    }))
                  }
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Optional"
                />

                <Field
                  label="Usage Limit"
                  value={couponForm.usageLimit}
                  onChange={(value) =>
                    setCouponForm((current) => ({
                      ...current,
                      usageLimit: value,
                    }))
                  }
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Unlimited"
                />

                <Field
                  label="Expiry"
                  value={couponForm.expiresAt}
                  onChange={(value) =>
                    setCouponForm((current) => ({
                      ...current,
                      expiresAt: value,
                    }))
                  }
                  type="datetime-local"
                />

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#071a3a] px-4 text-sm font-bold text-white transition hover:bg-[#102d59] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {couponForm.id ? (
                      <Save className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    {isPending
                      ? "Saving..."
                      : couponForm.id
                        ? "Update Coupon"
                        : "Create Coupon"}
                  </button>
                </div>

                <div className="md:col-span-2 xl:col-span-4">
                  <label className="inline-flex items-center gap-3 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={couponForm.isActive}
                      onChange={(event) =>
                        setCouponForm((current) => ({
                          ...current,
                          isActive:
                            event.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-300 accent-[#071a3a]"
                    />
                    Coupon is active
                  </label>
                </div>
              </form>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="font-black text-slate-900">
                  Coupon Library
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {data.coupons.length} coupon
                  {data.coupons.length === 1 ? "" : "s"} in the
                  store.
                </p>
              </div>

              {data.coupons.length === 0 ? (
                <EmptyState
                  icon={<Tag className="h-5 w-5" />}
                  title="No coupons yet"
                  description="Create your first customer discount code above."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[900px] w-full text-left">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-5 py-3 font-bold">
                          Code
                        </th>
                        <th className="px-5 py-3 font-bold">
                          Discount
                        </th>
                        <th className="px-5 py-3 font-bold">
                          Usage
                        </th>
                        <th className="px-5 py-3 font-bold">
                          Expiry
                        </th>
                        <th className="px-5 py-3 font-bold">
                          Status
                        </th>
                        <th className="px-5 py-3 text-right font-bold">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {data.coupons.map((coupon) => {
                        const expired =
                          coupon.isExpired;

                        return (
                          <tr
                            key={coupon.id}
                            className="hover:bg-slate-50/70"
                          >
                            <td className="px-5 py-4">
                              <div className="font-black tracking-wide text-slate-900">
                                {coupon.code}
                              </div>
                              <div className="mt-1 max-w-xs text-xs text-slate-500">
                                {coupon.description ||
                                  "No description"}
                              </div>
                            </td>

                            <td className="px-5 py-4 font-bold text-slate-900">
                              {coupon.discountType ===
                              "percentage"
                                ? `${coupon.discountValue}%`
                                : money(
                                    coupon.discountValue
                                  )}
                            </td>

                            <td className="px-5 py-4 text-sm text-slate-600">
                              {coupon.usedCount}
                              {" / "}
                              {coupon.usageLimit === null
                                ? "∞"
                                : coupon.usageLimit}
                            </td>

                            <td className="px-5 py-4 text-sm text-slate-600">
                              {date(coupon.expiresAt)}
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${
                                  expired
                                    ? "border-red-200 bg-red-50 text-red-700"
                                    : coupon.isActive
                                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                      : "border-slate-200 bg-slate-100 text-slate-600"
                                }`}
                              >
                                {expired
                                  ? "Expired"
                                  : coupon.isActive
                                    ? "Active"
                                    : "Inactive"}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    runAction(
                                      "toggle-coupon",
                                      () =>
                                        toggleCoupon(
                                          coupon.id,
                                          !coupon.isActive
                                        ),
                                      coupon.isActive
                                        ? "Coupon deactivated."
                                        : "Coupon activated."
                                    )
                                  }
                                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                                >
                                  {coupon.isActive
                                    ? "Deactivate"
                                    : "Activate"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    editCoupon(coupon)
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        `Delete coupon ${coupon.code}?`
                                      )
                                    ) {
                                      runAction(
                                        "delete-coupon",
                                        () =>
                                          deleteCoupon(
                                            coupon.id
                                          ),
                                        "Coupon deleted."
                                      );
                                    }
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {section === "discounts" && (
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="font-black text-slate-900">
                Product Discounts
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Set a sale price below the regular product price.
                Clear it to remove the discount.
              </p>
            </div>

            {data.products.length === 0 ? (
              <EmptyState
                icon={<Percent className="h-5 w-5" />}
                title="No products"
                description="Add products first before creating product discounts."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[950px] w-full text-left">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-bold">
                        Product
                      </th>
                      <th className="px-5 py-3 font-bold">
                        Regular Price
                      </th>
                      <th className="px-5 py-3 font-bold">
                        Current Sale
                      </th>
                      <th className="px-5 py-3 font-bold">
                        Stock
                      </th>
                      <th className="px-5 py-3 text-right font-bold">
                        Save Discount
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {data.products.map((product) => (
                      <DiscountRow
                        key={product.id}
                        product={product}
                        isPending={isPending}
                        onSave={(salePrice) =>
                          runAction(
                            `discount-${product.id}`,
                            () =>
                              updateProductSalePrice(
                                product.id,
                                salePrice
                              ),
                            "Product discount updated."
                          )
                        }
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {section === "featured" && (
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="font-black text-slate-900">
                Featured Products
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Choose which products should be featured in the store.
              </p>
            </div>

            {data.products.length === 0 ? (
              <EmptyState
                icon={<Sparkles className="h-5 w-5" />}
                title="No products"
                description="Add products first before selecting featured products."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[820px] w-full text-left">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-bold">
                        Product
                      </th>
                      <th className="px-5 py-3 font-bold">
                        Price
                      </th>
                      <th className="px-5 py-3 font-bold">
                        Stock
                      </th>
                      <th className="px-5 py-3 font-bold">
                        Featured
                      </th>
                      <th className="px-5 py-3 text-right font-bold">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {data.products.map((product) => (
                      <tr
                        key={product.id}
                        className="hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-900">
                            {product.name}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            SKU: {product.sku || "—"}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-900">
                            {money(product.price)}
                          </div>

                          {product.salePrice !== null && (
                            <div className="mt-1 text-xs font-semibold text-emerald-600">
                              Sale:{" "}
                              {money(product.salePrice)}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {product.stock}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${
                              product.featured
                                ? "border-amber-200 bg-amber-50 text-amber-700"
                                : "border-slate-200 bg-slate-100 text-slate-500"
                            }`}
                          >
                            {product.featured
                              ? "Featured"
                              : "Not Featured"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              runAction(
                                `featured-${product.id}`,
                                () =>
                                  toggleFeaturedProduct(
                                    product.id,
                                    !product.featured
                                  ),
                                product.featured
                                  ? "Product removed from featured."
                                  : "Product added to featured."
                              )
                            }
                            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold ${
                              product.featured
                                ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                : "bg-[#071a3a] text-white hover:bg-[#102d59]"
                            }`}
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            {product.featured
                              ? "Remove"
                              : "Feature"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {section === "banners" && (
          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#b28b16]">
                    {bannerForm.id
                      ? "Edit banner"
                      : "New banner"}
                  </p>

                  <h3 className="mt-1 text-xl font-black text-slate-900">
                    {bannerForm.id
                      ? "Update homepage banner"
                      : "Create homepage banner"}
                  </h3>
                </div>

                {bannerForm.id && (
                  <button
                    type="button"
                    onClick={resetBanner}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    <X className="h-4 w-4" />
                    Cancel edit
                  </button>
                )}
              </div>

              <form
                onSubmit={handleBannerSubmit}
                className="grid gap-4 md:grid-cols-2"
              >
                <Field
                  label="Title"
                  value={bannerForm.title}
                  onChange={(value) =>
                    setBannerForm((current) => ({
                      ...current,
                      title: value,
                    }))
                  }
                  placeholder="Weekend Special Offer"
                  required
                />

                <Field
                  label="Subtitle"
                  value={bannerForm.subtitle}
                  onChange={(value) =>
                    setBannerForm((current) => ({
                      ...current,
                      subtitle: value,
                    }))
                  }
                  placeholder="Save more when you shop today"
                />

                <div className="md:col-span-2">
                  <Field
                    label="Image URL"
                    value={bannerForm.imageUrl}
                    onChange={(value) =>
                      setBannerForm((current) => ({
                        ...current,
                        imageUrl: value,
                      }))
                    }
                    placeholder="https://..."
                    required
                  />
                </div>

                <Field
                  label="Button Text"
                  value={bannerForm.buttonText}
                  onChange={(value) =>
                    setBannerForm((current) => ({
                      ...current,
                      buttonText: value,
                    }))
                  }
                  placeholder="Shop Now"
                />

                <Field
                  label="Button URL"
                  value={bannerForm.buttonUrl}
                  onChange={(value) =>
                    setBannerForm((current) => ({
                      ...current,
                      buttonUrl: value,
                    }))
                  }
                  placeholder="/shop"
                />

                <Field
                  label="Sort Order"
                  value={bannerForm.sortOrder}
                  onChange={(value) =>
                    setBannerForm((current) => ({
                      ...current,
                      sortOrder: value,
                    }))
                  }
                  type="number"
                  step="1"
                  placeholder="0"
                />

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#071a3a] px-4 text-sm font-bold text-white hover:bg-[#102d59] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {bannerForm.id ? (
                      <Save className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    {isPending
                      ? "Saving..."
                      : bannerForm.id
                        ? "Update Banner"
                        : "Create Banner"}
                  </button>
                </div>

                <div className="md:col-span-2">
                  <label className="inline-flex items-center gap-3 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={bannerForm.isActive}
                      onChange={(event) =>
                        setBannerForm((current) => ({
                          ...current,
                          isActive:
                            event.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-300 accent-[#071a3a]"
                    />
                    Banner is active
                  </label>
                </div>
              </form>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="font-black text-slate-900">
                  Banner Library
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Manage the banners available to the storefront.
                </p>
              </div>

              {data.banners.length === 0 ? (
                <EmptyState
                  icon={<ImageIcon className="h-5 w-5" />}
                  title="No banners yet"
                  description="Create a homepage promotional banner above."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[1000px] w-full text-left">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-5 py-3 font-bold">
                          Banner
                        </th>
                        <th className="px-5 py-3 font-bold">
                          CTA
                        </th>
                        <th className="px-5 py-3 font-bold">
                          Order
                        </th>
                        <th className="px-5 py-3 font-bold">
                          Status
                        </th>
                        <th className="px-5 py-3 text-right font-bold">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {data.banners.map((banner) => (
                        <tr
                          key={banner.id}
                          className="hover:bg-slate-50/70"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="h-14 w-24 shrink-0 rounded-xl border border-slate-200 bg-slate-100 bg-cover bg-center"
                                style={{
                                  backgroundImage: `url(${banner.imageUrl})`,
                                }}
                              />

                              <div>
                                <div className="font-bold text-slate-900">
                                  {banner.title}
                                </div>

                                <div className="mt-1 max-w-md text-xs text-slate-500">
                                  {banner.subtitle ||
                                    "No subtitle"}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="text-sm font-bold text-slate-900">
                              {banner.buttonText || "—"}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {banner.buttonUrl || "—"}
                            </div>
                          </td>

                          <td className="px-5 py-4 text-sm font-bold text-slate-600">
                            {banner.sortOrder}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${
                                banner.isActive
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-slate-200 bg-slate-100 text-slate-500"
                              }`}
                            >
                              {banner.isActive
                                ? "Active"
                                : "Inactive"}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  runAction(
                                    "toggle-banner",
                                    () =>
                                      toggleBanner(
                                        banner.id,
                                        !banner.isActive
                                      ),
                                    banner.isActive
                                      ? "Banner deactivated."
                                      : "Banner activated."
                                  )
                                }
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                              >
                                {banner.isActive
                                  ? "Deactivate"
                                  : "Activate"}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  editBanner(banner)
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Delete banner "${banner.title}"?`
                                    )
                                  ) {
                                    runAction(
                                      "delete-banner",
                                      () =>
                                        deleteBanner(
                                          banner.id
                                        ),
                                      "Banner deleted."
                                    );
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {section === "campaigns" && (
          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#b28b16]">
                    {campaignForm.id
                      ? "Edit campaign"
                      : "New campaign"}
                  </p>

                  <h3 className="mt-1 text-xl font-black text-slate-900">
                    {campaignForm.id
                      ? "Update campaign"
                      : "Create campaign"}
                  </h3>
                </div>

                {campaignForm.id && (
                  <button
                    type="button"
                    onClick={resetCampaign}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    <X className="h-4 w-4" />
                    Cancel edit
                  </button>
                )}
              </div>

              <form
                onSubmit={handleCampaignSubmit}
                className="grid gap-4 md:grid-cols-2"
              >
                <Field
                  label="Campaign Name"
                  value={campaignForm.name}
                  onChange={(value) =>
                    setCampaignForm((current) => ({
                      ...current,
                      name: value,
                    }))
                  }
                  placeholder="December Shopping Campaign"
                  required
                />

                <SelectField
                  label="Status"
                  value={campaignForm.status}
                  options={[
                    {
                      value: "draft",
                      label: "Draft",
                    },
                    {
                      value: "scheduled",
                      label: "Scheduled",
                    },
                    {
                      value: "active",
                      label: "Active",
                    },
                    {
                      value: "ended",
                      label: "Ended",
                    },
                  ]}
                  onChange={(value) =>
                    setCampaignForm((current) => ({
                      ...current,
                      status:
                        value as CampaignForm["status"],
                    }))
                  }
                />

                <div className="md:col-span-2">
                  <TextAreaField
                    label="Description"
                    value={campaignForm.description}
                    onChange={(value) =>
                      setCampaignForm((current) => ({
                        ...current,
                        description: value,
                      }))
                    }
                    placeholder="Describe the purpose of this promotion."
                  />
                </div>

                <Field
                  label="Start Date & Time"
                  value={campaignForm.startsAt}
                  onChange={(value) =>
                    setCampaignForm((current) => ({
                      ...current,
                      startsAt: value,
                    }))
                  }
                  type="datetime-local"
                />

                <Field
                  label="End Date & Time"
                  value={campaignForm.endsAt}
                  onChange={(value) =>
                    setCampaignForm((current) => ({
                      ...current,
                      endsAt: value,
                    }))
                  }
                  type="datetime-local"
                />

                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex h-11 min-w-48 items-center justify-center gap-2 rounded-xl bg-[#071a3a] px-5 text-sm font-bold text-white hover:bg-[#102d59] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {campaignForm.id ? (
                      <Save className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    {isPending
                      ? "Saving..."
                      : campaignForm.id
                        ? "Update Campaign"
                        : "Create Campaign"}
                  </button>
                </div>
              </form>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="font-black text-slate-900">
                  Campaign Library
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Manage promotional campaigns and their schedules.
                </p>
              </div>

              {data.campaigns.length === 0 ? (
                <EmptyState
                  icon={<Megaphone className="h-5 w-5" />}
                  title="No campaigns yet"
                  description="Create a campaign to organize your promotions."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[950px] w-full text-left">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-5 py-3 font-bold">
                          Campaign
                        </th>
                        <th className="px-5 py-3 font-bold">
                          Status
                        </th>
                        <th className="px-5 py-3 font-bold">
                          Start
                        </th>
                        <th className="px-5 py-3 font-bold">
                          End
                        </th>
                        <th className="px-5 py-3 text-right font-bold">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {data.campaigns.map((campaign) => (
                        <tr
                          key={campaign.id}
                          className="hover:bg-slate-50/70"
                        >
                          <td className="px-5 py-4">
                            <div className="font-bold text-slate-900">
                              {campaign.name}
                            </div>

                            <div className="mt-1 max-w-md text-xs text-slate-500">
                              {campaign.description ||
                                "No description"}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusStyle(
                                campaign.status
                              )}`}
                            >
                              {statusLabel(
                                campaign.status
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {date(campaign.startsAt)}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {date(campaign.endsAt)}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  editCampaign(campaign)
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Delete campaign "${campaign.name}"?`
                                    )
                                  ) {
                                    runAction(
                                      "delete-campaign",
                                      () =>
                                        deleteCampaign(
                                          campaign.id
                                        ),
                                      "Campaign deleted."
                                    );
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <div className="flex gap-3">
                <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                <div>
                  <h4 className="font-black text-blue-900">
                    Promotion structure
                  </h4>
                  <p className="mt-1 text-sm leading-6 text-blue-800/80">
                    Campaigns organize your promotional activity.
                    Coupons, sale prices, featured products and
                    homepage banners remain independently manageable
                    and can be used together for the same campaign.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-[#071a3a]">
        {icon}
      </div>

      <div className="mt-4 text-2xl font-black text-slate-900">
        {value}
      </div>

      <p className="mt-1 text-xs font-semibold text-slate-500">
        {label}
      </p>
    </div>
  );
}

function QuickActionCard({
  icon,
  title,
  description,
  count,
  buttonLabel,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  count: number;
  buttonLabel: string;
  onClick: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#071a3a] text-[#d4af37]">
          {icon}
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
          {count}
        </span>
      </div>

      <h3 className="mt-5 text-lg font-black text-slate-900">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {description}
      </p>

      <button
        type="button"
        onClick={onClick}
        className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#071a3a] hover:text-[#b28b16]"
      >
        {buttonLabel}
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  min,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  min?: string;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        required={required}
        min={min}
        step={step}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#071a3a] focus:ring-2 focus:ring-[#071a3a]/10"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>

      <textarea
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        rows={4}
        className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#071a3a] focus:ring-2 focus:ring-[#071a3a]/10"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: {
    value: string;
    label: string;
  }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#071a3a] focus:ring-2 focus:ring-[#071a3a]/10"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function DiscountRow({
  product,
  isPending,
  onSave,
}: {
  product: MarketingProduct;
  isPending: boolean;
  onSave: (salePrice: number | null) => void;
}) {
  const [value, setValue] = useState(
    product.salePrice === null
      ? ""
      : String(product.salePrice)
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!value.trim()) {
      onSave(null);
      return;
    }

    const salePrice = Number(value);

    if (!Number.isFinite(salePrice)) {
      return;
    }

    onSave(salePrice);
  }

  return (
    <tr className="hover:bg-slate-50/70">
      <td className="px-5 py-4">
        <div className="font-bold text-slate-900">
          {product.name}
        </div>

        <div className="mt-1 text-xs text-slate-500">
          SKU: {product.sku || "—"}
        </div>
      </td>

      <td className="px-5 py-4">
        <span className="font-black text-slate-900">
          {money(product.price)}
        </span>
      </td>

      <td className="px-5 py-4">
        {product.salePrice !== null ? (
          <span className="font-black text-emerald-600">
            {money(product.salePrice)}
          </span>
        ) : (
          <span className="text-sm text-slate-400">
            No sale price
          </span>
        )}
      </td>

      <td className="px-5 py-4 text-sm text-slate-600">
        {product.stock}
      </td>

      <td className="px-5 py-4">
        <form
          onSubmit={submit}
          className="flex justify-end gap-2"
        >
          <input
            type="number"
            min="0"
            max={product.price - 0.01}
            step="0.01"
            value={value}
            onChange={(event) =>
              setValue(event.target.value)
            }
            placeholder="Sale price"
            className="h-10 w-36 rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-[#071a3a] focus:ring-2 focus:ring-[#071a3a]/10"
          />

          {value && (
            <button
              type="button"
              onClick={() => {
                setValue("");
                onSave(null);
              }}
              disabled={isPending}
              className="h-10 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              Clear
            </button>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#071a3a] px-3 text-xs font-bold text-white hover:bg-[#102d59] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Check className="h-3.5 w-3.5" />
            Save
          </button>
        </form>
      </td>
    </tr>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        {icon}
      </div>

      <h3 className="mt-4 text-lg font-black text-slate-900">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}