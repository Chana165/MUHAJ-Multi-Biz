"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ViewMode = "login" | "forgot" | "recovery";

export default function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const [mode, setMode] = useState<ViewMode>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const recoveryFromUrl =
    searchParams.get("mode") === "recovery";

  const activeMode: ViewMode =
    recoveryFromUrl && mode === "login"
      ? "recovery"
      : mode;

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("recovery");
        setMessage(
          "Your password reset link has been verified. Set a new password below."
        );
        setError("");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  function clearFeedback() {
    setMessage("");
    setError("");
  }

  function switchToLogin() {
    clearFeedback();
    setMode("login");
    router.replace("/admin/login");
  }

  function switchToForgot() {
    clearFeedback();
    setMode("forgot");
  }

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    clearFeedback();

    try {
      const { data, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

      if (authError || !data.user) {
        setError(
          authError?.message || "Unable to sign in."
        );
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("role, is_active")
          .eq("id", data.user.id)
          .maybeSingle();

      if (profileError) {
        await supabase.auth.signOut();

        setError(
          "Your account could not be verified as an administrator."
        );
        return;
      }

      if (profile?.is_active === false) {
        await supabase.auth.signOut();

        setError(
          "This administrator account is currently disabled."
        );
        return;
      }

      if (
        profile?.role !== "admin" &&
        profile?.role !== "super_admin"
      ) {
        await supabase.auth.signOut();

        setError(
          "This account does not have administrator access."
        );
        return;
      }

      try {
        await fetch(
          "/api/admin/users/last-login",
          {
            method: "POST",
          }
        );
      } catch {
        // Login should continue even if activity logging is unavailable.
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError(
        "Something went wrong while signing in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    clearFeedback();

    try {
      const normalizedEmail =
        email.trim().toLowerCase();

      if (!normalizedEmail) {
        setError(
          "Enter your administrator email address."
        );
        return;
      }

      const redirectTo =
        `${window.location.origin}/admin/login?mode=recovery`;

      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(
          normalizedEmail,
          {
            redirectTo,
          }
        );

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setMessage(
        "Password reset instructions have been sent to your email address. Check your inbox and follow the link."
      );
    } catch {
      setError(
        "Unable to send the password reset email. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordRecovery(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    clearFeedback();

    try {
      if (newPassword.length < 8) {
        setError(
          "Your new password must contain at least 8 characters."
        );
        return;
      }

      if (newPassword !== confirmPassword) {
        setError(
          "The new passwords do not match."
        );
        return;
      }

      const { error: updateError } =
        await supabase.auth.updateUser({
          password: newPassword,
        });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      await supabase.auth.signOut();

      setNewPassword("");
      setConfirmPassword("");
      setPassword("");
      setMode("login");

      router.replace("/admin/login");

      setMessage(
        "Your password has been updated successfully. You can now sign in with your new password."
      );
    } catch {
      setError(
        "Unable to update your password. Please request a new reset link."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      {message && (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
          {error}
        </div>
      )}

      {/* ======================================================
          NORMAL LOGIN
      ====================================================== */}

      {activeMode === "login" && (
        <form
          onSubmit={handleLogin}
          className="mt-8 space-y-5"
        >
          <div>
            <label
              htmlFor="admin-email"
              className="mb-2 block text-base font-bold text-[#263e61]"
            >
              Email Address
            </label>

            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  clearFeedback();
                }}
                autoComplete="email"
                required
                placeholder="Administrator email"
                className="h-16 w-full rounded-2xl border border-[#bfd0e3] bg-white px-5 pl-12 text-base text-[#071a3a] outline-none transition placeholder:text-[#8090a6] focus:border-[#071a3a] focus:ring-2 focus:ring-[#071a3a]/10 sm:text-lg"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="mb-2 block text-base font-bold text-[#263e61]"
            >
              Password
            </label>

            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input
                id="admin-password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  clearFeedback();
                }}
                autoComplete="current-password"
                required
                placeholder="Enter your password"
                className="h-16 w-full rounded-2xl border border-[#bfd0e3] bg-white px-5 pl-12 pr-12 text-base text-[#071a3a] outline-none transition placeholder:text-[#8090a6] focus:border-[#071a3a] focus:ring-2 focus:ring-[#071a3a]/10 sm:text-lg"
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

            {/* Forgot password BELOW password */}
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={switchToForgot}
                className="text-sm font-bold text-[#071a3a] transition hover:text-[#b28b16]"
              >
                Forgot password?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="h-16 w-full rounded-2xl bg-[#121b31] px-5 text-lg font-bold text-white shadow-sm transition hover:bg-[#071a3a] disabled:cursor-not-allowed disabled:opacity-60 sm:text-xl"
          >
            {loading
              ? "Signing In..."
              : "Sign In"}
          </button>
        </form>
      )}

      {/* ======================================================
          FORGOT PASSWORD
      ====================================================== */}

      {activeMode === "forgot" && (
        <form
          onSubmit={handleForgotPassword}
          className="mt-8 space-y-5"
        >
          <div>
            <label
              htmlFor="reset-email"
              className="mb-2 block text-base font-bold text-[#263e61]"
            >
              Email Address
            </label>

            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  clearFeedback();
                }}
                autoComplete="email"
                required
                placeholder="Administrator email"
                className="h-16 w-full rounded-2xl border border-[#bfd0e3] bg-white px-5 pl-12 text-base text-[#071a3a] outline-none transition placeholder:text-[#8090a6] focus:border-[#071a3a] focus:ring-2 focus:ring-[#071a3a]/10 sm:text-lg"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="h-16 w-full rounded-2xl bg-[#121b31] px-5 text-lg font-bold text-white shadow-sm transition hover:bg-[#071a3a] disabled:cursor-not-allowed disabled:opacity-60 sm:text-xl"
          >
            {loading
              ? "Sending..."
              : "Send Reset Link"}
          </button>

          <button
            type="button"
            onClick={switchToLogin}
            className="mx-auto flex items-center gap-2 text-sm font-bold text-[#58708f] transition hover:text-[#071a3a]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </button>
        </form>
      )}

      {/* ======================================================
          PASSWORD RECOVERY
      ====================================================== */}

      {activeMode === "recovery" && (
        <form
          onSubmit={handlePasswordRecovery}
          className="mt-8 space-y-5"
        >
          <div>
            <label
              htmlFor="new-password"
              className="mb-2 block text-base font-bold text-[#263e61]"
            >
              New Password
            </label>

            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input
                id="new-password"
                type={
                  showNewPassword
                    ? "text"
                    : "password"
                }
                value={newPassword}
                onChange={(event) => {
                  setNewPassword(
                    event.target.value
                  );
                  clearFeedback();
                }}
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="At least 8 characters"
                className="h-16 w-full rounded-2xl border border-[#bfd0e3] bg-white px-5 pl-12 pr-12 text-base text-[#071a3a] outline-none transition placeholder:text-[#8090a6] focus:border-[#071a3a] focus:ring-2 focus:ring-[#071a3a]/10 sm:text-lg"
              />

              <button
                type="button"
                onClick={() =>
                  setShowNewPassword(
                    (value) => !value
                  )
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-[#071a3a]"
                aria-label={
                  showNewPassword
                    ? "Hide new password"
                    : "Show new password"
                }
              >
                {showNewPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="mb-2 block text-base font-bold text-[#263e61]"
            >
              Confirm Password
            </label>

            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input
                id="confirm-password"
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
                  clearFeedback();
                }}
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="Repeat your new password"
                className="h-16 w-full rounded-2xl border border-[#bfd0e3] bg-white px-5 pl-12 pr-12 text-base text-[#071a3a] outline-none transition placeholder:text-[#8090a6] focus:border-[#071a3a] focus:ring-2 focus:ring-[#071a3a]/10 sm:text-lg"
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
            className="h-16 w-full rounded-2xl bg-[#121b31] px-5 text-lg font-bold text-white shadow-sm transition hover:bg-[#071a3a] disabled:cursor-not-allowed disabled:opacity-60 sm:text-xl"
          >
            {loading
              ? "Updating..."
              : "Update Password"}
          </button>

          <button
            type="button"
            onClick={switchToLogin}
            className="mx-auto flex items-center gap-2 text-sm font-bold text-[#58708f] transition hover:text-[#071a3a]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </button>
        </form>
      )}
    </div>
  );
}