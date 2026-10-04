"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Package,
  Settings,
  Star,
  Store,
  Truck,
  Users,
  Wallet,
  Warehouse,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { signOut } from "@/app/admin/actions";

interface AdminProfile {
  full_name: string | null;
  role: string;
}

interface AdminShellProps {
  profile: AdminProfile;
  activeHref: string;
  children: ReactNode;
}

const primaryNavigation = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "Orders",
    href: "/admin/orders",
    icon: ClipboardList,
  },
  {
    label: "Products",
    href: "/admin/products",
    icon: Package,
  },
  {
    label: "Customers",
    href: "/admin/customers",
    icon: Users,
  },
  {
    label: "Inventory",
    href: "/admin/inventory",
    icon: Warehouse,
  },
  {
    label: "Payments",
    href: "/admin/payments",
    icon: Wallet,
  },
  {
    label: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
  },
];

const storeNavigation = [
  {
    label: "Marketing",
    href: "/admin/marketing",
    icon: Megaphone,
  },
  {
    label: "Reviews",
    href: "/admin/reviews",
    icon: Star,
  },
  {
    label: "Shipping",
    href: "/admin/shipping",
    icon: Truck,
  },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
];

export default function AdminShell({
  profile,
  activeHref,
  children,
}: AdminShellProps) {
  const pathname = usePathname();
  const isDashboard = pathname === "/admin";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100">
      {/* ======================================================
          MOBILE / TABLET BACKDROP
          ====================================================== */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[2px] lg:hidden"
        />
      )}

      {/* ======================================================
          SIDEBAR
          ====================================================== */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex flex-col",
          "bg-[#061a3a] text-white shadow-2xl",
          "transition-all duration-300 ease-in-out",
          "lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "lg:w-20" : "w-72 lg:w-64",
        ].join(" ")}
      >
        {/* BRAND */}
        <div
          className={[
            "flex h-[86px] shrink-0 items-center border-b border-white/10",
            collapsed ? "justify-center px-3" : "justify-between px-5",
          ].join(" ")}
        >
          {collapsed ? (
            <Link
              href="/admin"
              onClick={() => setSidebarOpen(false)}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-400/60 bg-slate-950 font-black text-2xl text-amber-400"
              aria-label="MUHAJ dashboard"
            >
              M
            </Link>
          ) : (
            <Link
              href="/admin"
              onClick={() => setSidebarOpen(false)}
              className="min-w-0"
            >
              <p className="text-xl font-black tracking-wide">
                MUHAJ
              </p>

              <p className="text-[10px] font-black tracking-[0.28em] text-amber-400">
                MULTI BIZ
              </p>

              <p className="mt-1 text-[11px] text-white/45">
                Admin Portal
              </p>
            </Link>
          )}

          {/* DESKTOP COLLAPSE */}
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className={[
              "hidden h-9 w-9 items-center justify-center rounded-lg",
              "text-white/50 transition hover:bg-white/10 hover:text-white",
              "lg:flex",
              collapsed ? "absolute -right-3 top-7 rounded-full bg-[#061a3a] shadow-lg" : "",
            ].join(" ")}
            aria-label={
              collapsed
                ? "Expand sidebar"
                : "Collapse sidebar"
            }
          >
            {collapsed ? (
              <ChevronRight size={17} />
            ) : (
              <ChevronLeft size={17} />
            )}
          </button>

          {/* MOBILE CLOSE */}
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        {/* NAVIGATION */}
        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
          {!collapsed && (
            <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
              Main
            </p>
          )}

          <div className="space-y-1">
            {primaryNavigation.map((item) => {
              const Icon = item.icon;
              const active = activeHref === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? item.label : undefined}
                  className={[
                    "group flex items-center rounded-xl transition",
                    collapsed
                      ? "justify-center px-3 py-3"
                      : "gap-3 px-3.5 py-3",
                    active
                      ? "bg-amber-400 font-bold text-slate-950"
                      : "text-white/65 hover:bg-white/10 hover:text-white",
                  ].join(" ")}
                >
                  <Icon
                    size={18}
                    className="shrink-0"
                  />

                  {!collapsed && (
                    <span className="text-sm">
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="my-6 border-t border-white/10" />

          {!collapsed && (
            <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
              Store
            </p>
          )}

          <div className="space-y-1">
            {storeNavigation.map((item) => {
              const Icon = item.icon;
              const active = activeHref === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? item.label : undefined}
                  className={[
                    "group flex items-center rounded-xl transition",
                    collapsed
                      ? "justify-center px-3 py-3"
                      : "gap-3 px-3.5 py-3",
                    active
                      ? "bg-amber-400 font-bold text-slate-950"
                      : "text-white/65 hover:bg-white/10 hover:text-white",
                  ].join(" ")}
                >
                  <Icon
                    size={18}
                    className="shrink-0"
                  />

                  {!collapsed && (
                    <span className="text-sm">
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* USER */}
          {!collapsed ? (
            <div className="mt-6 rounded-2xl bg-[#031229] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-400 font-black text-slate-950">
                  {(profile.full_name || "A")
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">
                    {profile.full_name || "Administrator"}
                  </p>

                  <p className="mt-0.5 text-xs text-amber-400">
                    {profile.role}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 flex justify-center">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400 font-black text-slate-950"
                title={profile.full_name || "Administrator"}
              >
                {(profile.full_name || "A")
                  .charAt(0)
                  .toUpperCase()}
              </div>
            </div>
          )}
        </nav>

        {/* BOTTOM */}
        <div
          className={[
            "shrink-0 border-t border-white/10",
            collapsed ? "p-3" : "p-3",
          ].join(" ")}
        >
          <Link
            href="/"
            onClick={() => setSidebarOpen(false)}
            title={collapsed ? "View Store" : undefined}
            className={[
              "mb-1 flex items-center rounded-xl text-sm font-medium text-white/65 transition hover:bg-white/10 hover:text-white",
              collapsed
                ? "justify-center px-3 py-3"
                : "gap-3 px-3.5 py-3",
            ].join(" ")}
          >
            <Store
              size={18}
              className="shrink-0"
            />

            {!collapsed && <span>View Store</span>}
          </Link>

          <form action={signOut}>
            <button
              type="submit"
              title={collapsed ? "Sign Out" : undefined}
              className={[
                "flex w-full items-center rounded-xl text-left text-sm font-medium text-white/65 transition hover:bg-red-500/10 hover:text-red-300",
                collapsed
                  ? "justify-center px-3 py-3"
                  : "gap-3 px-3.5 py-3",
              ].join(" ")}
            >
              <LogOut
                size={18}
                className="shrink-0"
              />

              {!collapsed && <span>Sign Out</span>}
            </button>
          </form>
        </div>
      </aside>

      {/* ======================================================
          MOBILE / TABLET TOP BAR
          ====================================================== */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur lg:hidden">
        <div className="flex h-[70px] items-center justify-between px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#061a3a] text-amber-400 shadow-sm"
            aria-label="Open admin navigation"
          >
            <Menu size={21} />
          </button>

          <Link
            href="/admin"
            className="text-center"
          >
            <p className="text-lg font-black tracking-wide text-[#061a3a]">
              MUHAJ
            </p>

            <p className="text-[9px] font-black tracking-[0.25em] text-amber-600">
              MULTI BIZ
            </p>
          </Link>

          <Link
            href="/"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-[#061a3a]"
            aria-label="View store"
          >
            <Store size={18} />
          </Link>
        </div>
      </header>

      {/* ======================================================
          DESKTOP CONTENT
          ====================================================== */}
      <div
        className={[
          "min-h-screen transition-[padding] duration-300",
          collapsed ? "lg:pl-20" : "lg:pl-64",
        ].join(" ")}
      >
        {isDashboard ? (
            children
          ) : (
            <div className="min-h-full w-full bg-[#f7f8fb] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
  <div className="mx-auto w-full max-w-[1180px]">
    {children}
  </div>
</div>
          )}
      </div>
    </div>
  );
}