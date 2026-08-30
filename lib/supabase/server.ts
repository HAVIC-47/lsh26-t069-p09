import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { anonKey, hasAuth, supabaseUrl } from "./config";

export { hasAuth };

/**
 * Session-scoped client carrying the signed-in user's JWT, so row-level
 * security actually applies to whatever it reads. This is the client every
 * page read should use.
 */
export async function createSessionClient() {
  if (!hasAuth) return null;
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl!, anonKey!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies. The middleware refreshes the
          // session on every request, so this is safe to swallow.
        }
      },
    },
  });
}
