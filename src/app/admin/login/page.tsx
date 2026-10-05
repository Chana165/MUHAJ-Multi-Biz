import { Suspense } from "react";
import AdminLoginForm from "./AdminLoginForm";

export const metadata = {
  title: "Admin Login | MUHAJ Multi Biz",
  description: "MUHAJ Multi Biz administrator login.",
};

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400 text-2xl font-black text-slate-950">
            M
          </div>

          <h1 className="text-3xl font-bold text-white">
            MUHAJ Multi Biz
          </h1>
        </div>

        <div className="rounded-3xl bg-white p-7 shadow-2xl sm:p-8">
          <h2 className="text-center text-2xl font-bold text-slate-900">
            Administrator Sign In
          </h2>

          <div className="mt-7">
            <Suspense fallback={null}>
              <AdminLoginForm />
            </Suspense>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          MUHAJ Multi Biz · Snacks and More
        </p>
      </div>
    </main>
  );
}