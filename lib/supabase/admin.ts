import "server-only";
import { createClient } from "@supabase/supabase-js";
import { hasSupabase, serviceKey, supabaseUrl } from "./config";

export { hasSupabase };

/**
 * Service-role client. It BYPASSES every row-level security policy, so it must
 * only ever be reached after an explicit role check in lib/auth.ts. Never
 * import this into a client component — `server-only` makes that a build error.
 */
export const admin = hasSupabase
  ? createClient(supabaseUrl!, serviceKey!, { auth: { persistSession: false } })
  : null;
