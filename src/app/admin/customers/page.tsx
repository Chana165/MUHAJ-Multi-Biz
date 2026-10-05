import { getCustomers } from "./actions";
import CustomerManager from "./CustomerManager";

export const dynamic =
  "force-dynamic";

export default async function CustomersPage() {
  const result =
    await getCustomers();

  return (
    <CustomerManager
      initialCustomers={
        result.customers
      }
      stats={result.stats}
      loadError={
        result.success
          ? undefined
          : result.error
      }
    />
  );
}