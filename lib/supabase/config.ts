/**
 * Treats an unset variable and an unfilled placeholder as the same thing.
 * `.env.local` ships with PASTE_..._HERE markers, and a non-empty placeholder
 * would otherwise look configured and throw deep inside the Supabase client at
 * build time rather than falling back cleanly.
 */
const usable = (v: string | undefined) =>
  Boolean(v && v.trim() && !v.includes("PASTE_"));

export const supabaseUrl = usable(process.env.NEXT_PUBLIC_SUPABASE_URL)
  ? process.env.NEXT_PUBLIC_SUPABASE_URL!
  : undefined;

export const anonKey = usable(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  : undefined;

export const serviceKey = usable(process.env.SUPABASE_SERVICE_ROLE_KEY)
  ? process.env.SUPABASE_SERVICE_ROLE_KEY!
  : undefined;

const validUrl = Boolean(supabaseUrl && /^https?:\/\/[^\s]+$/.test(supabaseUrl));

/** Database configured — reads and writes can hit Postgres. */
export const hasSupabase = validUrl && Boolean(serviceKey);

/** Auth configured — sign-in and role scoping are available. */
export const hasAuth = validUrl && Boolean(anonKey);
