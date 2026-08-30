import Link from "next/link";
import { LogIn, LogOut, UserRound } from "lucide-react";
import { currentProfile, ROLE_LABEL } from "@/lib/auth";
import { hasAuth } from "@/lib/supabase/server";
import { signOutAction } from "@/app/(app)/login/actions";

export async function UserMenu() {
  const profile = await currentProfile();

  if (!profile) {
    return (
      <div className="space-y-1.5">
        <p className="hidden text-xs text-muted lg:block">
          {hasAuth ? "Signed out — read-only" : "Demo data — read-only"}
        </p>
        {hasAuth && (
          <Link
            href="/login"
            className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-border px-2.5 text-sm font-medium transition-colors duration-200 hover:border-primary hover:text-primary"
          >
            <LogIn className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            Sign in
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-start gap-2">
        <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-muted" strokeWidth={2} aria-hidden="true" />
        <div className="hidden min-w-0 lg:block">
          <p className="truncate text-sm font-medium">{profile.full_name}</p>
          <p className="text-xs text-muted">{ROLE_LABEL[profile.role]}</p>
        </div>
      </div>
      <form action={signOutAction}>
        <button
          type="submit"
          className="flex h-9 w-full cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg border border-border px-2.5 text-sm font-medium text-muted transition-colors duration-200 hover:border-primary hover:text-primary"
        >
          <LogOut className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          Sign out
        </button>
      </form>
    </div>
  );
}
