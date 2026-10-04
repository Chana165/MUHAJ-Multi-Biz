import { getStoreSettings } from "./actions";
import SettingsManager from "./SettingsManager";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const result = await getStoreSettings();

  return (
    <SettingsManager
      initialSettings={result.settings}
      loadError={
        result.success
          ? undefined
          : result.error
      }
    />
  );
}