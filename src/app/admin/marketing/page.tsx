import AdminShell from "@/components/admin/AdminShell";
import AdminModulePlaceholder from "@/components/admin/AdminModulePlaceholder";
import { requireAdmin } from "@/lib/supabase/require-admin";

export const metadata = {
  title: "Marketing | MUHAJ Multi Biz",
};

export default async function MarketingPage() {
  const { profile } = await requireAdmin();

  return (
    <AdminShell profile={profile} activeHref="/admin/marketing">
      <AdminModulePlaceholder
        title="Marketing"
        description="Manage promotions, discounts, coupons and store campaigns."
        activeHref="/admin/marketing"
        items={[
          "Coupons",
          "Discounts",
          "Promotions",
          "Featured Products",
          "Homepage Banners",
          "Campaigns",
        ]}
      />
    </AdminShell>
  );
}