"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/auth";
import type { UserRole } from "@/lib/types";
import { usernameToEmail, validateUsername, toUsernameSlug } from "@/lib/username";

export type AuthorityState = { error?: string; success?: string } | null;

const VALID_ROLES: UserRole[] = ["super_admin", "mosque_authority", "hostel_authority"];

/**
 * Provisions an authority account.
 *
 * This is the one place the service-role key is used — creating a Supabase
 * Auth user requires it. The key lives only in server env, and the caller
 * is checked to be the Super Admin before the client is ever constructed.
 */
export async function createAuthority(
  _prev: AuthorityState,
  formData: FormData,
): Promise<AuthorityState> {
  try {
    await requireSuperAdmin("/admin/authorities");
  } catch {
    return { error: "Only the Super Admin can create accounts." };
  }

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "") as UserRole;
  const locationIds = formData.getAll("location_ids").map(String).filter(Boolean);

  const usernameError = validateUsername(username);
  if (usernameError) return { error: usernameError };
  if (password.length < 8) return { error: "The password must be at least 8 characters." };
  if (!fullName) return { error: "Enter the person's full name." };
  if (!VALID_ROLES.includes(role)) return { error: "Choose a role." };

  const email = usernameToEmail(username);
  const slug = toUsernameSlug(username);

  let admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Admin client unavailable." };
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });

  if (createError || !created.user) {
    const duplicate = /already|registered|exists/i.test(createError?.message ?? "");
    return {
      error: duplicate
        ? `The username "${slug}" is already taken. Choose another.`
        : (createError?.message ?? "Could not create the account."),
    };
  }

  // The auth trigger inserts the profile row; this fills in the details it
  // could not know and guarantees the role even if metadata was ignored.
  const { error: profileError } = await admin
    .from("profiles")
    .update({ full_name: fullName, email, phone, role, active: true })
    .eq("id", created.user.id);

  if (profileError) {
    return { error: `Account created, but the profile failed to save: ${profileError.message}` };
  }

  if (locationIds.length > 0) {
    const { error: assignError } = await admin
      .from("location_managers")
      .insert(locationIds.map((location_id) => ({ user_id: created.user!.id, location_id })));
    if (assignError) {
      return { error: `Account created, but assignment failed: ${assignError.message}` };
    }
  }

  revalidatePath("/admin/authorities");
  revalidatePath("/admin");
  return { success: `${fullName} can now sign in with the username "${slug}".` };
}

/** Replaces an authority's whole set of assignments in one transaction-ish pass. */
export async function setAuthorityLocations(
  _prev: AuthorityState,
  formData: FormData,
): Promise<AuthorityState> {
  try {
    await requireSuperAdmin("/admin/authorities");
  } catch {
    return { error: "Only the Super Admin can reassign authorities." };
  }

  const userId = String(formData.get("user_id") ?? "");
  if (!userId) return { error: "No authority selected." };

  const locationIds = [...new Set(formData.getAll("location_ids").map(String).filter(Boolean))];

  const supabase = await createClient();

  const { error: clearError } = await supabase
    .from("location_managers")
    .delete()
    .eq("user_id", userId);
  if (clearError) return { error: `Could not update assignments: ${clearError.message}` };

  if (locationIds.length > 0) {
    const { error: insertError } = await supabase
      .from("location_managers")
      .insert(locationIds.map((location_id) => ({ user_id: userId, location_id })));
    if (insertError) return { error: `Could not save assignments: ${insertError.message}` };
  }

  revalidatePath("/admin/authorities");
  return {
    success:
      locationIds.length === 0
        ? "All assignments removed."
        : `Assigned to ${locationIds.length} ${locationIds.length === 1 ? "location" : "locations"}.`,
  };
}

export async function updateAuthority(
  _prev: AuthorityState,
  formData: FormData,
): Promise<AuthorityState> {
  try {
    await requireSuperAdmin("/admin/authorities");
  } catch {
    return { error: "Only the Super Admin can edit authorities." };
  }

  const userId = String(formData.get("user_id") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "") as UserRole;

  if (!userId) return { error: "No authority selected." };
  if (!fullName) return { error: "Enter the person's full name." };
  if (!VALID_ROLES.includes(role)) return { error: "Choose a role." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, phone, role })
    .eq("id", userId);

  if (error) return { error: `Could not save: ${error.message}` };

  revalidatePath("/admin/authorities");
  return { success: `${fullName} updated.` };
}

/**
 * Disables or re-enables an account. Disabling is preferred over deletion:
 * the person's past edits stay attributed in the audit log.
 */
export async function setAuthorityActive(
  _prev: AuthorityState,
  formData: FormData,
): Promise<AuthorityState> {
  let session;
  try {
    session = await requireSuperAdmin("/admin/authorities");
  } catch {
    return { error: "Only the Super Admin can disable accounts." };
  }

  const userId = String(formData.get("user_id") ?? "");
  const active = formData.get("active") === "true";
  if (!userId) return { error: "No authority selected." };

  if (userId === session.profile.id && !active) {
    return { error: "You cannot disable your own Super Admin account." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ active }).eq("id", userId);
  if (error) return { error: `Could not update the account: ${error.message}` };

  revalidatePath("/admin/authorities");
  return { success: active ? "Account re-enabled." : "Account disabled." };
}

/** Permanently removes an authority's login. Audit rows survive with a null user. */
export async function deleteAuthority(
  _prev: AuthorityState,
  formData: FormData,
): Promise<AuthorityState> {
  let session;
  try {
    session = await requireSuperAdmin("/admin/authorities");
  } catch {
    return { error: "Only the Super Admin can delete accounts." };
  }

  const userId = String(formData.get("user_id") ?? "");
  if (!userId) return { error: "No authority selected." };
  if (userId === session.profile.id) {
    return { error: "You cannot delete your own account." };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Admin client unavailable." };
  }

  // Deleting the auth user cascades to the profile and its assignments.
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: `Could not delete the account: ${error.message}` };

  revalidatePath("/admin/authorities");
  revalidatePath("/admin");
  return { success: "Authority account deleted." };
}

/**
 * Adds one assignment without disturbing the person's existing ones.
 *
 * `setAuthorityLocations` replaces the whole set, which is right for the
 * "edit assignments" dialog but wrong for the per-location "+" button —
 * there, a location is gaining a second or third representative and the
 * others must stay put.
 */
export async function addAssignment(
  _prev: AuthorityState,
  formData: FormData,
): Promise<AuthorityState> {
  try {
    await requireSuperAdmin("/admin");
  } catch {
    return { error: "Only the Super Admin can assign authorities." };
  }

  const userId = String(formData.get("user_id") ?? "");
  const locationId = String(formData.get("location_id") ?? "");
  if (!userId || !locationId) return { error: "Choose a person and a location." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("location_managers")
    .upsert({ user_id: userId, location_id: locationId }, { onConflict: "user_id,location_id" });

  if (error) return { error: `Could not assign: ${error.message}` };

  revalidatePath("/admin");
  revalidatePath("/admin/authorities");
  return { success: "Authority assigned." };
}

/** Removes a single person from a single location. */
export async function removeAssignment(
  _prev: AuthorityState,
  formData: FormData,
): Promise<AuthorityState> {
  try {
    await requireSuperAdmin("/admin");
  } catch {
    return { error: "Only the Super Admin can remove assignments." };
  }

  const userId = String(formData.get("user_id") ?? "");
  const locationId = String(formData.get("location_id") ?? "");
  if (!userId || !locationId) return { error: "Nothing to remove." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("location_managers")
    .delete()
    .eq("user_id", userId)
    .eq("location_id", locationId);

  if (error) return { error: `Could not remove: ${error.message}` };

  revalidatePath("/admin");
  revalidatePath("/admin/authorities");
  return { success: "Assignment removed." };
}
