"use client";

import {
  ArrowLeft,
  Eye,
  EyeOff,
  LockKeyhole,
} from "lucide-react";
import {
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminFirstPasswordForm() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  function clearError() {
    setError("");
  }

  async function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (password.length < 8) {
      setError(
        "Your new password must contain at least 8 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        "The new passwords do not match."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "/api/admin/users/first-password",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            password,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Unable to change your password."
        );
      }

      setPassword("");
      setConfirmPassword("");

      router.replace("/admin");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to change your password."
      );
    } finally {
      setLoading(false);
    }
  }

  async function cancel() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="w-full">
      {error ? (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
        You are signing in with a temporary administrator password.
        Please create your personal password before continuing.
      </div>

      <form
        onSubmit={submit}
        className="space-y-5"
      >
        <div>
          <label
            htmlFor="first-new-password"
            className="mb-2 block text-sm font-bold text-[#263e61]"
          >
            New Password
          </label>

          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

            <input
              id="first-new-password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              value={password}
              onChange={(event) => {
                setPassword(
                  event.target.value
                );
                clearError();
              }}
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="At least 8 characters"
              className="h-14 w-full rounded-2xl border border-[#bfd0e3] bg-white px-5 pl-12 pr-12 text-base text-[#071a3a] outline-none transition placeholder:text-[#8090a6] focus:border-[#071a3a] focus:ring-2 focus:ring-[#071a3a]/10"
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(
                  (value) => !value
                )
              }
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-[#071a3a]"
              aria-label={
                showPassword
                  ? "Hide password"
                  : "Show password"
              }
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="first-confirm-password"
            className="mb-2 block text-sm font-bold text-[#263e61]"
          >
            Confirm Password
          </label>

          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

            <input
              id="first-confirm-password"
              type={
                showConfirmPassword
                  ? "text"
                  : "password"
              }
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(
                  event.target.value
                );
                clearError();
              }}
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="Repeat your new password"
              className="h-14 w-full rounded-2xl border border-[#bfd0e3] bg-white px-5 pl-12 pr-12 text-base text-[#071a3a] outline-none transition placeholder:text-[#8090a6] focus:border-[#071a3a] focus:ring-2 focus:ring-[#071a3a]/10"
            />

            <button
              type="button"
              onClick={() =>
                setShowConfirmPassword(
                  (value) => !value
                )
              }
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-[#071a3a]"
              aria-label={
                showConfirmPassword
                  ? "Hide confirmation password"
                  : "Show confirmation password"
              }
            >
              {showConfirmPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="h-14 w-full rounded-2xl bg-[#121b31] px-5 text-lg font-bold text-white shadow-sm transition hover:bg-[#071a3a] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? "Updating Password..."
            : "Set New Password"}
        </button>

        <button
          type="button"
          onClick={() => void cancel()}
          className="mx-auto flex items-center gap-2 text-sm font-bold text-[#58708f] transition hover:text-[#071a3a]"
        >
          <ArrowLeft className="h-4 w-4" />
          Sign out
        </button>
      </form>
    </div>
  );
}