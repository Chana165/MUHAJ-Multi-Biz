import { requireAdmin } from "@/lib/supabase/require-admin";
import AdminShell from "@/components/admin/AdminShell";
import ReviewsManager from "./ReviewsManager";
import { getReviews } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Reviews | MUHAJ Multi Biz",
  description:
    "Manage customer reviews for MUHAJ Multi Biz.",
};

export default async function ReviewsPage() {
  const { profile } = await requireAdmin();
  const result = await getReviews();

  return (
    <AdminShell
      profile={profile}
      activeHref="/admin/reviews"
    >
      <ReviewsManager
        initialReviews={result.reviews}
        loadError={
          result.success
            ? undefined
            : result.error
        }
      />
    </AdminShell>
  );
}