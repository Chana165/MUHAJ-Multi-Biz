"use client";

import {
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  Power,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";

type AdminUser = {
  id: string;
  full_name: string | null;
  admin_display_name: string | null;
  role: "admin" | "super_admin";
  email: string;
  is_active: boolean;
  must_change_password: boolean;
  last_login_at: string | null;
  created_by: string | null;
};

export default function AdminUsersPanel() {
  const [users, setUsers] = useState<AdminUser[]>(
    []
  );

  const [isSuperAdmin, setIsSuperAdmin] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [temporaryPassword, setTemporaryPassword] =
    useState("");

  const [copied, setCopied] =
    useState(false);

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/admin/users",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (response.status === 403) {
        setIsSuperAdmin(false);
        return;
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Unable to load administrator accounts."
        );
      }

      setIsSuperAdmin(
        Boolean(result.isSuperAdmin)
      );

      setUsers(
        Array.isArray(result.users)
          ? result.users
          : []
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load administrator accounts."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    fetch("/api/admin/users", {
      method: "GET",
      cache: "no-store",
    })
      .then(async (response) => {
        const result = await response.json();

        if (cancelled) {
          return;
        }

        if (response.status === 403) {
          setIsSuperAdmin(false);
          return;
        }

        if (!response.ok || !result.success) {
          throw new Error(
            result.error ||
              "Unable to load administrator accounts."
          );
        }

        setIsSuperAdmin(
          Boolean(result.isSuperAdmin)
        );

        setUsers(
          Array.isArray(result.users)
            ? result.users
            : []
        );
      })
      .catch((loadError) => {
        if (cancelled) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load administrator accounts."
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function createAdmin() {
    setMessage("");
    setError("");
    setTemporaryPassword("");
    setCopied(false);

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2) {
      setError(
        "Enter the new administrator's name."
      );
      return;
    }

    if (
      !cleanEmail ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        cleanEmail
      )
    ) {
      setError(
        "Enter a valid administrator email address."
      );
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        "/api/admin/users",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            displayName: cleanName,
            email: cleanEmail,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Unable to create administrator."
        );
      }

      setName("");
      setEmail("");
      setTemporaryPassword(
        result.temporaryPassword || ""
      );

      setMessage(
        "Administrator account created successfully."
      );

      await loadUsers();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create administrator."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(
    user: AdminUser
  ) {
    setMessage("");
    setError("");

    try {
      setSaving(true);

      const response = await fetch(
        "/api/admin/users",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            userId: user.id,
            isActive: !user.is_active,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Unable to update administrator status."
        );
      }

      setMessage(
        `${user.admin_display_name || user.full_name || user.email} is now ${
          result.isActive
            ? "active"
            : "inactive"
        }.`
      );

      await loadUsers();
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : "Unable to update administrator status."
      );
    } finally {
      setSaving(false);
    }
  }

  async function copyPassword() {
    if (!temporaryPassword) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        temporaryPassword
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setError(
        "The temporary password could not be copied. Please copy it manually."
      );
    }
  }

  function formatLastLogin(
    value: string | null
  ) {
    if (!value) {
      return "Not recorded";
    }

    try {
      return new Intl.DateTimeFormat(
        "en-NG",
        {
          dateStyle: "medium",
          timeStyle: "short",
        }
      ).format(new Date(value));
    } catch {
      return "Not recorded";
    }
  }

  if (!isSuperAdmin && !loading) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <ShieldCheck className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">
              Administrator Users
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Manage administrator access for MUHAJ Multi Biz.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 px-5 py-6 sm:px-6">
        {(error || message) ? (
          <div
            className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${
              error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {error ? (
              <X className="mt-0.5 h-5 w-5 shrink-0" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            )}

            <div className="flex-1">
              <p className="font-semibold">
                {error
                  ? "Administrator notice"
                  : "Administrator update"}
              </p>

              <p className="mt-1 leading-6">
                {error || message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setError("");
                setMessage("");
              }}
              className="text-slate-400 transition hover:text-slate-600"
              aria-label="Dismiss notice"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {temporaryPassword ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

              <div className="min-w-0 flex-1">
                <p className="font-bold text-amber-950">
                  Temporary password created
                </p>

                <p className="mt-1 text-sm leading-6 text-amber-800">
                  Give this password securely to the new administrator.
                  It will be required for the first login, and the
                  administrator must replace it with a personal password.
                </p>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <div className="min-w-0 flex-1 rounded-xl border border-amber-200 bg-white px-4 py-3">
                    <code className="break-all text-sm font-bold tracking-wide text-slate-900">
                      {temporaryPassword}
                    </code>
                  </div>

                  <button
                    type="button"
                    onClick={copyPassword}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#061a3a] px-4 text-sm font-semibold text-white transition hover:bg-[#0a2857]"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy Password
                      </>
                    )}
                  </button>
                </div>

                <p className="mt-3 text-xs font-medium text-amber-800">
                  This password is shown only now. Keep it private.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setTemporaryPassword("");
                  setCopied(false);
                }}
                className="text-amber-700 transition hover:text-amber-950"
                aria-label="Close temporary password"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
              <UserPlus className="h-5 w-5" />
            </div>

            <div>
              <h3 className="font-bold text-slate-950">
                Add Administrator
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Creates a standard Admin account with a generated temporary password.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div>
              <label
                htmlFor="new-admin-name"
                className="text-sm font-semibold text-slate-800"
              >
                Full Name
              </label>

              <input
                id="new-admin-name"
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="Administrator name"
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#061a3a] focus:ring-2 focus:ring-[#061a3a]/10"
              />
            </div>

            <div>
              <label
                htmlFor="new-admin-email"
                className="text-sm font-semibold text-slate-800"
              >
                Email Address
              </label>

              <input
                id="new-admin-email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="admin@example.com"
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#061a3a] focus:ring-2 focus:ring-[#061a3a]/10"
              />
            </div>

            <button
              type="button"
              onClick={createAdmin}
              disabled={saving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#061a3a] px-5 text-sm font-semibold text-white transition hover:bg-[#0a2857] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Create Admin
                </>
              )}
            </button>
          </div>
        </div>

        <div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-bold text-slate-950">
                Administrator Accounts
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Active accounts can access the administration area.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadUsers()}
              disabled={loading || saving}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loading ? "animate-spin" : ""
                }`}
              />
              Refresh
            </button>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
            {loading ? (
              <div className="flex min-h-28 items-center justify-center text-sm text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading administrator accounts...
              </div>
            ) : users.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-500">
                No administrator accounts found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[820px] w-full text-left">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3">
                        Administrator
                      </th>
                      <th className="px-4 py-3">
                        Role
                      </th>
                      <th className="px-4 py-3">
                        Status
                      </th>
                      <th className="px-4 py-3">
                        Password
                      </th>
                      <th className="px-4 py-3">
                        Last Login
                      </th>
                      <th className="px-4 py-3 text-right">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-900">
                            {user.admin_display_name ||
                              user.full_name ||
                              "Administrator"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {user.email || "Email unavailable"}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                              user.role ===
                              "super_admin"
                                ? "bg-slate-900 text-white"
                                : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {user.role ===
                            "super_admin"
                              ? "Super Admin"
                              : "Admin"}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                              user.is_active
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {user.is_active
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          {user.must_change_password ? (
                            <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                              Change Required
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-slate-500">
                              Set
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {formatLastLogin(
                            user.last_login_at
                          )}
                        </td>

                        <td className="px-4 py-4 text-right">
                          {user.role ===
                          "super_admin" ? (
                            <span className="text-xs font-semibold text-slate-400">
                              Protected
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                void toggleStatus(
                                  user
                                )
                              }
                              disabled={saving}
                              className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                user.is_active
                                  ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                                  : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              }`}
                            >
                              <Power className="h-3.5 w-3.5" />
                              {user.is_active
                                ? "Deactivate"
                                : "Activate"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}