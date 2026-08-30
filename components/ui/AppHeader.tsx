import Link from "next/link";
import { ROLE_LABEL, type Profile } from "@/lib/auth";
import { Wordmark } from "@/components/brand/Monogram";
import { HeaderNav } from "@/components/ui/HeaderNav";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SignOutButton } from "@/components/ui/SignOutButton";

export function AppHeader({ profile }: { profile: Profile }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] items-center gap-5 px-4 py-2.5 lg:px-6">
        <Link href="/" className="shrink-0">
          <Wordmark size={26} />
        </Link>

        <HeaderNav role={profile.role} variant="bar" />

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <div className="hidden text-right sm:block">
            <p className="text-[13px] leading-tight font-medium text-text">
              {profile.full_name}
            </p>
            <p className="eyebrow text-[9px]">{ROLE_LABEL[profile.role]}</p>
          </div>
          <ThemeToggle />
          <SignOutButton />
        </div>
      </div>

      <HeaderNav role={profile.role} variant="rail" />
    </header>
  );
}
