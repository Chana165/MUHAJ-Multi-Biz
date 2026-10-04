import { getReviews } from "./actions";
import ReviewsManager from "./ReviewsManager";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const result = await getReviews();

  return (
    <ReviewsManager
      initialReviews={result.reviews}
      loadError={
        result.success
          ? undefined
          : result.error
      }
    />
  );
}