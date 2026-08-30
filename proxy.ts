import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { anonKey, hasAuth, supabaseUrl } from "@/lib/supabase/config";

/**
 * Refreshes the Supabase session cookie on every request. Server Components
 * cannot write cookies, so without this a session would silently expire mid
 * browse. It does not gate any route: pages decide what a visitor may see,
 * which keeps the deployed demo openable without credentials.
 */
export async function proxy(request: NextRequest) {
  if (!hasAuth) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl!, anonKey!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and image files.
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
