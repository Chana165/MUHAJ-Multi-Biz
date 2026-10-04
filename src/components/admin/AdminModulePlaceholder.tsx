import Link from "next/link";

interface AdminModulePlaceholderProps {
  title: string;
  description: string;
  activeHref: string;
  items: string[];
}

export default function AdminModulePlaceholder({
  title,
  description,
  activeHref,
  items,
}: AdminModulePlaceholderProps) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6">
      <div className="rounded-3xl bg-slate-900 p-7 text-white sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-400">
          MUHAJ Multi Biz
        </p>

        <h1 className="mt-2 text-3xl font-black">
          {title}
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
          {description}
        </p>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div
            key={item}
            className="rounded-2xl bg-white p-6 shadow-sm"
          >
            <p className="font-bold text-slate-900">
              {item}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              This module will be connected to the live MUHAJ
              database as we build the system.
            </p>
          </div>
        ))}
      </div>

      <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <p className="text-sm font-semibold text-amber-900">
          Navigation is active. This area is reserved for the next
          functional module.
        </p>

        <Link
          href="/admin"
          className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"
        >
          Back to Dashboard
        </Link>
      </div>
    </section>
  );
}