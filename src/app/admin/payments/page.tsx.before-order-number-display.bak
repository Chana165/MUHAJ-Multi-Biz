import { getPayments } from "./actions";
import PaymentManager from "./PaymentManager";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const result = await getPayments();

  return (
    <PaymentManager
      initialPayments={result.payments}
      loadError={result.success ? undefined : result.error}
    />
  );
}
