"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { admin, hasSupabase } from "@/lib/supabase/admin";
import { SETTING_META, type Settings } from "@/lib/settings-schema";

export type SettingsState = { ok: boolean; message: string } | null;

export async function updateSettingsAction(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  try {
    await requirePermission("editCatalogue");
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Not permitted." };
  }

  if (!hasSupabase || !admin) {
    return { ok: false, message: "Supabase is not configured for this deployment." };
  }

  const patch: Partial<Settings> = {};

  for (const meta of SETTING_META) {
    const raw = formData.get(meta.key);
    if (raw == null) continue;
    const n = Number(raw);
    if (!Number.isFinite(n) || !Number.isInteger(n)) {
      return { ok: false, message: `${meta.label} must be a whole number.` };
    }
    if (n < meta.min || n > meta.max) {
      return {
        ok: false,
        message: `${meta.label} must be between ${meta.min} and ${meta.max} ${meta.unit}.`,
      };
    }
    patch[meta.key] = n;
  }

  const { error } = await admin.from("app_config").update(patch).eq("id", 1);
  if (error) {
    return {
      ok: false,
      message:
        error.message.includes("column")
          ? "These columns do not exist yet — run supabase/migration-roles.sql first."
          : error.message,
    };
  }

  // Every dated figure in the app derives from these, so refresh everything.
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved. Every prediction now uses the new values." };
}
