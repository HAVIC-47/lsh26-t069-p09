import { requireUser } from "@/lib/auth";
import { AppHeader } from "@/components/ui/AppHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";

/**
 * The workshop shell, and the outer access boundary: everything in this route
 * group requires a signed-in user. A signed-out visitor is sent to /login
 * before any page here renders, so no workshop data reaches them.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const profile = await requireUser();

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader profile={profile} />
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-8 lg:px-6">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
