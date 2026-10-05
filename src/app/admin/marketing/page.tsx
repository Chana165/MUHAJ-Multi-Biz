import MarketingManager from "./MarketingManager";
import { getMarketingData } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Marketing | MUHAJ Multi Biz",
  description: "MUHAJ Multi Biz marketing management.",
};

export default async function MarketingPage() {
  const result = await getMarketingData();

  return (
    <MarketingManager
      initialData={result.data}
      loadError={result.success ? undefined : result.error}
    />
  );
}