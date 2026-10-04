import { getShippingMethods } from "./actions";
import ShippingManager from "./ShippingManager";

export const dynamic = "force-dynamic";

export default async function ShippingPage() {
  const result = await getShippingMethods();

  return (
    <ShippingManager
      initialMethods={result.methods}
      loadError={
        result.success
          ? undefined
          : result.error
      }
    />
  );
}