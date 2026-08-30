import "server-only";
import { cache } from "react";
import { createSessionClient } from "./supabase/server";
import { hasSupabase } from "./supabase/config";
import { DEFAULT_SETTINGS, type Settings } from "./settings-schema";

export { DEFAULT_SETTINGS, SETTING_META, type Settings } from "./settings-schema";

/**
 * Reads the tunable variables. Falls back to the compiled defaults when the
 * columns are absent, so the app still runs before the role migration is
 * applied rather than erroring on every page.
 */
export const getSettings = cache(async (): Promise<{
  settings: Settings;
  stored: boolean;
}> => {
  if (!hasSupabase) return { settings: DEFAULT_SETTINGS, stored: false };

  const supabase = await createSessionClient();
  if (!supabase) return { settings: DEFAULT_SETTINGS, stored: false };

  const { data, error } = await supabase
    .from("app_config")
    .select("soon_days, default_km_per_day, max_km_per_day, churn_days, document_days")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) return { settings: DEFAULT_SETTINGS, stored: false };

  return {
    settings: {
      soon_days: data.soon_days ?? DEFAULT_SETTINGS.soon_days,
      default_km_per_day: data.default_km_per_day ?? DEFAULT_SETTINGS.default_km_per_day,
      max_km_per_day: data.max_km_per_day ?? DEFAULT_SETTINGS.max_km_per_day,
      churn_days: data.churn_days ?? DEFAULT_SETTINGS.churn_days,
      document_days: data.document_days ?? DEFAULT_SETTINGS.document_days,
    },
    stored: true,
  };
});
