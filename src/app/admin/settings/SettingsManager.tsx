"use client";

import {
  useState,
  useTransition,
  type FormEvent,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  Globe2,
  ImageIcon,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Save,
  Settings2,
  Store,
  X,
} from "lucide-react";

import {
  updateStoreSettings,
  type StoreSettings,
} from "./actions";
import AdminUsersPanel from "./AdminUsersPanel";

type Props = {
  initialSettings: StoreSettings | null;
  loadError?: string;
};

type Form = {
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

const emptyForm: Form = {
  storeName: "MUHAJ Multi Biz",
  tagline: "SNACKS AND MORE",
  description: "",
  phone: "07033672170",
  email: "muhajmultybiz@gmail.com",
  whatsapp: "07033672170",
  address: "Federal Low-Cost, Bauchi",
  city: "Bauchi",
  state: "Bauchi",
  country: "Nigeria",
  logoUrl: "",
  faviconUrl: "",
  currency: "NGN",
};

function fromSettings(
  settings: StoreSettings
): Form {
  return {
    storeName:
      settings.storeName ||
      emptyForm.storeName,
    tagline:
      settings.tagline ||
      emptyForm.tagline,
    description:
      settings.description || "",
    phone:
      settings.phone ||
      emptyForm.phone,
    email:
      settings.email ||
      emptyForm.email,
    whatsapp:
      settings.whatsapp ||
      emptyForm.whatsapp,
    address:
      settings.address ||
      emptyForm.address,
    city:
      settings.city ||
      emptyForm.city,
    state:
      settings.state ||
      emptyForm.state,
    country:
      settings.country ||
      emptyForm.country,
    logoUrl:
      settings.logoUrl || "",
    faviconUrl:
      settings.faviconUrl || "",
    currency:
      settings.currency ||
      emptyForm.currency,
  };
}

export default function SettingsManager({
  initialSettings,
  loadError,
}: Props) {
  const [settings, setSettings] =
    useState<StoreSettings | null>(
      initialSettings
    );

  const [form, setForm] = useState<Form>(
    initialSettings
      ? fromSettings(initialSettings)
      : emptyForm
  );

  const [pending, startTransition] =
    useTransition();

  const [error, setError] = useState("");
  const [message, setMessage] =
    useState("");

  function update(
    key: keyof Form,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function save(event: FormEvent) {
    event.preventDefault();

    setError("");
    setMessage("");

    startTransition(async () => {
      const result =
        await updateStoreSettings(
          settings?.id ?? null,
          form
        );

      if (!result.success) {
        setError(
          result.error ??
            "Unable to save store settings."
        );
        return;
      }

      if (result.settings) {
        setSettings(result.settings);
        setForm(fromSettings(result.settings));
      }

      setMessage(
        "Store settings saved successfully."
      );
    });
  }

  return (
    <div className="admin-module-page space-y-6">
      <div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          Store Settings
        </h1>
      </div>

      {(loadError || error || message) ? (
        <div
          className={`flex gap-3 rounded-2xl border p-4 text-sm ${
            loadError || error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {loadError || error ? (
            <AlertCircle className="h-5 w-5 shrink-0" />
          ) : (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          )}

          <div>
            <p className="font-semibold">
              {loadError || error
                ? "Settings notice"
                : "Settings update"}
            </p>

            <p className="mt-1">
              {loadError || error || message}
            </p>
          </div>

          {!pending ? (
            <button
              type="button"
              onClick={() => {
                setError("");
                setMessage("");
              }}
              className="ml-auto text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ) : null}

      <form
        onSubmit={save}
        className="space-y-6"
      >
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <Store className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Store Information
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  The basic identity customers will see.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 px-5 py-6 sm:grid-cols-2 sm:px-6">
            <div>
              <label className="text-sm font-semibold text-slate-800">
                Store Name
              </label>

              <input
                required
                value={form.storeName}
                onChange={(e) =>
                  update(
                    "storeName",
                    e.target.value
                  )
                }
                placeholder="MUHAJ Multi Biz"
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#061a3a] focus:ring-2 focus:ring-[#061a3a]/10"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-800">
                Tagline
              </label>

              <input
                value={form.tagline}
                onChange={(e) =>
                  update(
                    "tagline",
                    e.target.value
                  )
                }
                placeholder="SNACKS AND MORE"
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#061a3a] focus:ring-2 focus:ring-[#061a3a]/10"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm font-semibold text-slate-800">
                Store Description
              </label>

              <textarea
                rows={4}
                value={form.description}
                onChange={(e) =>
                  update(
                    "description",
                    e.target.value
                  )
                }
                placeholder="Describe MUHAJ Multi Biz and what the store offers."
                className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm leading-6 outline-none focus:border-[#061a3a] focus:ring-2 focus:ring-[#061a3a]/10"
              />
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <Phone className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Contact Information
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Contact details used by customers to reach the business.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 px-5 py-6 sm:grid-cols-2 sm:px-6">
            <div>
              <label className="text-sm font-semibold text-slate-800">
                Phone
              </label>

              <div className="relative mt-2">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) =>
                    update(
                      "phone",
                      e.target.value
                    )
                  }
                  placeholder="07033672170"
                  className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-[#061a3a] focus:ring-2 focus:ring-[#061a3a]/10"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-800">
                WhatsApp
              </label>

              <div className="relative mt-2">
                <MessageCircle className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="tel"
                  value={form.whatsapp}
                  onChange={(e) =>
                    update(
                      "whatsapp",
                      e.target.value
                    )
                  }
                  placeholder="07033672170"
                  className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-[#061a3a] focus:ring-2 focus:ring-[#061a3a]/10"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm font-semibold text-slate-800">
                Email
              </label>

              <div className="relative mt-2">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    update(
                      "email",
                      e.target.value
                    )
                  }
                  placeholder="store@example.com"
                  className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-[#061a3a] focus:ring-2 focus:ring-[#061a3a]/10"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <MapPin className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Store Location
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Your business address and operating location.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 px-5 py-6 sm:grid-cols-2 sm:px-6">
            <div className="sm:col-span-2">
              <label className="text-sm font-semibold text-slate-800">
                Address
              </label>

              <input
                value={form.address}
                onChange={(e) =>
                  update(
                    "address",
                    e.target.value
                  )
                }
                placeholder="Federal Low-Cost, Bauchi"
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#061a3a] focus:ring-2 focus:ring-[#061a3a]/10"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-800">
                City
              </label>

              <input
                value={form.city}
                onChange={(e) =>
                  update(
                    "city",
                    e.target.value
                  )
                }
                placeholder="Bauchi"
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#061a3a] focus:ring-2 focus:ring-[#061a3a]/10"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-800">
                State
              </label>

              <input
                value={form.state}
                onChange={(e) =>
                  update(
                    "state",
                    e.target.value
                  )
                }
                placeholder="Bauchi"
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#061a3a] focus:ring-2 focus:ring-[#061a3a]/10"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-800">
                Country
              </label>

              <div className="relative mt-2">
                <Globe2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={form.country}
                  onChange={(e) =>
                    update(
                      "country",
                      e.target.value
                    )
                  }
                  placeholder="Nigeria"
                  className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-[#061a3a] focus:ring-2 focus:ring-[#061a3a]/10"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-800">
                Currency
              </label>

              <select
                value={form.currency}
                onChange={(e) =>
                  update(
                    "currency",
                    e.target.value
                  )
                }
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-[#061a3a] focus:ring-2 focus:ring-[#061a3a]/10"
              >
                <option value="NGN">
                  NGN â€” Nigerian Naira
                </option>
                <option value="USD">
                  USD â€” US Dollar
                </option>
                <option value="GBP">
                  GBP â€” British Pound
                </option>
                <option value="EUR">
                  EUR â€” Euro
                </option>
              </select>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <ImageIcon className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Store Branding
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Set the logo and favicon used by the store.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 px-5 py-6 sm:px-6 lg:grid-cols-[1fr_280px]">
            <div className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-slate-800">
                  Logo URL
                </label>

                <input
                  type="url"
                  value={form.logoUrl}
                  onChange={(e) =>
                    update(
                      "logoUrl",
                      e.target.value
                    )
                  }
                  placeholder="https://..."
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#061a3a] focus:ring-2 focus:ring-[#061a3a]/10"
                />

                <p className="mt-1 text-xs text-slate-400">
                  Use a publicly accessible image URL for the official store logo.
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-800">
                  Favicon URL
                </label>

                <input
                  type="url"
                  value={form.faviconUrl}
                  onChange={(e) =>
                    update(
                      "faviconUrl",
                      e.target.value
                    )
                  }
                  placeholder="https://..."
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#061a3a] focus:ring-2 focus:ring-[#061a3a]/10"
                />

                <p className="mt-1 text-xs text-slate-400">
                  Optional browser tab icon.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Logo Preview
              </p>

              <div className="mt-4 flex min-h-44 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-5">
                {form.logoUrl ? (
                  <img
                    src={form.logoUrl}
                    alt="Store logo preview"
                    className="max-h-32 max-w-full object-contain"
                  />
                ) : (
                  <div className="text-center">
                    <Settings2 className="mx-auto h-8 w-8 text-slate-300" />

                    <p className="mt-2 text-xs text-slate-400">
                      No logo URL provided
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-medium text-slate-400">
                  Store
                </p>

                <p className="mt-1 font-bold text-slate-950">
                  {form.storeName ||
                    "MUHAJ Multi Biz"}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {form.tagline ||
                    "SNACKS AND MORE"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="sticky bottom-4 z-10 flex justify-end">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#061a3a] px-6 text-sm font-semibold text-white shadow-lg hover:bg-[#0a2857] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>

      <AdminUsersPanel />
    </div>
  );
}