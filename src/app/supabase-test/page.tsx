import { createClient } from "@/lib/supabase/server";

export default async function SupabaseTestPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("store_settings")
    .select("store_name, city, state, country, currency")
    .limit(1)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">
          MUHAJ Multi Biz
        </h1>

        <p className="mt-2 text-slate-600">
          Supabase Database Test
        </p>

        {error ? (
          <div className="mt-8 rounded-xl bg-red-50 p-5 text-red-700">
            <p className="font-semibold">Connection failed</p>
            <p className="mt-2 text-sm">{error.message}</p>
          </div>
        ) : (
          <div className="mt-8 rounded-xl bg-green-50 p-5 text-green-700">
            <p className="font-semibold">
              Supabase connected successfully ✅
            </p>

            <pre className="mt-4 overflow-auto rounded-lg bg-slate-50 p-4 text-sm text-slate-800">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}
