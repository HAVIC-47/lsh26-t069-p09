import Link from "next/link";
import { Wordmark } from "@/components/brand/Monogram";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SiteFooter } from "@/components/ui/SiteFooter";

/**
 * Auth pages sit outside the workshop shell — there is no signed-in user yet,
 * so no role-specific navigation to draw and no auth guard to run (guarding
 * these would loop).
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-[1400px] items-center px-4 py-2.5 lg:px-6">
          <Link href="/">
            <Wordmark size={26} />
          </Link>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-8 lg:px-6">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
