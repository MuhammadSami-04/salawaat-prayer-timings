"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { usernameToEmail } from "@/lib/username";

export type ActionState = { error?: string; success?: string } | null;

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured) {
    return { error: "Supabase is not configured. See supabase/README.md." };
  }

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirect") ?? "/dashboard");

  if (!username || !password) {
    return { error: "Enter both your username and password." };
  }

  // The username maps deterministically onto the account's address, so no
  // lookup — and therefore no anonymous read of the user list — is needed.
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  });

  if (error) {
    return { error: "That username and password did not match an account." };
  }

  // A deactivated authority keeps their Supabase login but loses all access.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let destination = redirectTo.startsWith("/") ? redirectTo : "/dashboard";

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("active, role")
      .eq("id", user.id)
      .maybeSingle<{ active: boolean; role: string }>();

    if (profile && !profile.active) {
      await supabase.auth.signOut();
      return { error: "This account has been disabled. Contact the Super Admin." };
    }

    // A Super Admin arriving without a specific destination belongs in the
    // admin console, not the authority dashboard.
    if (profile?.role === "super_admin" && destination === "/dashboard") {
      destination = "/admin";
    }
  }

  revalidatePath("/", "layout");
  redirect(destination);
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect("/login");
}

/**
 * Lets any signed-in user change their own password.
 *
 * Everyone is handed a password by the Super Admin, so this is how a hostel
 * representative stops sharing the one they were given.
 */
export async function changePassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isSupabaseConfigured) return { error: "Supabase is not configured." };

  const current = String(formData.get("current_password") ?? "");
  const next = String(formData.get("new_password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (next.length < 8) return { error: "The new password must be at least 8 characters." };
  if (next !== confirm) return { error: "The two new passwords do not match." };
  if (next === current) return { error: "The new password must differ from the current one." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "You are not signed in." };

  // Re-check the current password so a walk-up at an unlocked screen cannot
  // silently take the account over.
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: current,
  });
  if (reauthError) return { error: "Your current password is not correct." };

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { error: `Could not change the password: ${error.message}` };

  revalidatePath("/dashboard");
  return { success: "Your password has been changed." };
}
