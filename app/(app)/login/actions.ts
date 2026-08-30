"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSessionClient, hasAuth } from "@/lib/supabase/server";

export type LoginState = { message: string } | null;

export async function signInAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  if (!hasAuth) {
    return { message: "Supabase auth is not configured for this deployment." };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { message: "Enter both an email and a password." };

  const supabase = await createSessionClient();
  if (!supabase) return { message: "Supabase auth is not configured." };

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  // Supabase deliberately does not say whether it was the email or the
  // password that was wrong; repeating its wording keeps it that way.
  if (error) return { message: error.message };

  revalidatePath("/", "layout");
  redirect("/desk");
}

export async function signOutAction() {
  const supabase = await createSessionClient();
  await supabase?.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
