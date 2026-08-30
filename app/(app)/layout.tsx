import Link from "next/link";
import { Wrench } from "lucide-react";
import { SideNav } from "@/components/ui/SideNav";
import { UserMenu } from "@/components/ui/UserMenu";

/**
 * Workshop chrome. Async because the shell shows who is signed in; that begins
 * streaming, which pins a notFound() response at 200 — but loading.tsx already
 * streams every route here, so it costs nothing further. Noted in the README.
 */
export default async function AppLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <div className="lg:flex">
      <aside className="border-b border-border bg-surface lg:sticky lg:top-0 lg:h-dvh lg:w-56 lg:shrink-0 lg:border-r lg:border-b-0">
        <div className="flex items-center gap-4 px-4 py-3 lg:h-full lg:flex-col lg:items-stretch lg:gap-6 lg:pb-6">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 font-semibold tracking-tight text-heading"
          >
            <Wrench className="h-5 w-5 text-primary" strokeWidth={2.2} aria-hidden="true" />
            Service<span className="-ml-2 text-primary">Due</span>
          </Link>
          <div className="min-w-0 flex-1 lg:flex-none">
            <SideNav />
          </div>
          <div className="ml-auto shrink-0 lg:mt-auto lg:ml-0 lg:border-t lg:border-border lg:pt-4">
            <UserMenu />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
        <footer className="border-t border-border px-4 py-4 text-xs text-muted">
          <div className="mx-auto max-w-7xl">
            Team T069 · Problem P09 · LofiStack Hackathon 2026
          </div>
        </footer>
      </div>
    </div>
  );
}
