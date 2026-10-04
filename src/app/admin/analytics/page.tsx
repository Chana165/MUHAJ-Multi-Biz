import { getAnalytics } from "./actions";
import AnalyticsManager from "./AnalyticsManager";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const result = await getAnalytics(30);

  return (
    <AnalyticsManager
      initialData={result.data}
      loadError={result.success ? undefined : result.error}
    />
  );
}