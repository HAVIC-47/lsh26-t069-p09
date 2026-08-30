"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { admin, hasSupabase } from "@/lib/supabase/admin";
import { createSessionClient, hasAuth } from "@/lib/supabase/server";

export type SignUpState = { message: string } | null;

/** Dataset numbers are stored as 01XXXXXXXXX; compare on digits alone. */
const digits = (s: string) => s.replace(/\D/g, "").replace(/^880/, "0");

/**
 * Public sign-up creates a CUSTOMER account and nothing else. Staff accounts
 * are made by an admin, so no one can grant themselves workshop access here.
 *
 * The claim is verified against a phone number already on the workshop's
 * register. That is deliberately a demo-grade check: a real deployment would
 * send a one-time code to the number instead of trusting whoever types it.
 * Documented as such in the README.
 */
export async function signUpAction(
  _prev: SignUpState,
  formData: FormData
): Promise<SignUpState> {
  if (!hasAuth || !hasSupabase || !admin) {
    return { message: "Sign-up is unavailable — Supabase is not configured here." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const phone = digits(String(formData.get("phone") ?? ""));

  if (!email || !password || !phone) {
    return { message: "Fill in every field." };
  }
  if (password.length < 8) {
    return { message: "Use a password of at least 8 characters." };
  }

  const { data: owners, error: ownerErr } = await admin
    .from("owners")
    .select("id, name, phone");
  if (ownerErr) return { message: `Could not check the register: ${ownerErr.message}` };

  const owner = (owners ?? []).find((o) => digits(o.phone) === phone);
  if (!owner) {
    return {
      message:
        "No vehicle on the workshop register uses that phone number. Ask the workshop to add you, or sign in with a demo account.",
    };
  }

  const { data: taken } = await admin
    .from("profiles")
    .select("id")
    .eq("owner_id", owner.id)
    .maybeSingle();
  if (taken) {
    return {
      message: `${owner.name} already has an account. Sign in instead, or ask the workshop to reset it.`,
    };
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr || !created.user) {
    return { message: createErr?.message ?? "Could not create the account." };
  }

  const { error: profileErr } = await admin.from("profiles").insert({
    id: created.user.id,
    full_name: owner.name,
    role: "customer",
    owner_id: owner.id,
  });
  if (profileErr) {
    // Do not leave an auth user with no profile — it would sign in to nothing.
    await admin.auth.admin.deleteUser(created.user.id);
    return { message: `Could not finish setting up the account: ${profileErr.message}` };
  }

  const supabase = await createSessionClient();
  await supabase?.auth.signInWithPassword({ email, password });

  revalidatePath("/", "layout");
  redirect("/garage");
}
