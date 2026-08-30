import { LogOut } from "lucide-react";
import { signOutAction } from "@/app/(auth)/login/actions";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        aria-label="Sign out"
        title="Sign out"
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border text-muted transition-colors duration-200 hover:border-border-strong hover:text-text"
      >
        <LogOut className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
      </button>
    </form>
  );
}
