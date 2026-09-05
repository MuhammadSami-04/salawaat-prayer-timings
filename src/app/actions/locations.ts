"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/auth";
import type { LocationType } from "@/lib/types";

export type LocationState = { error?: string; success?: string } | null;

const VALID_TYPES: LocationType[] = ["mosque", "hostel"];

function readLocationFields(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    type: String(formData.get("type") ?? "") as LocationType,
    description: String(formData.get("description") ?? "").trim() || null,
    building: String(formData.get("building") ?? "").trim() || null,
    contact: String(formData.get("contact") ?? "").trim() || null,
    active: formData.get("active") !== null,
    sort_order: Number(formData.get("sort_order") ?? 0) || 0,
  };
}

/**
 * Adds a location. This is the whole reason nothing is hard-coded: the
 * Super Admin types "Hostel 18" here and every list in the app picks it up.
 */
export async function createLocation(
  _prev: LocationState,
  formData: FormData,
): Promise<LocationState> {
  try {
    await requireSuperAdmin("/admin/locations");
  } catch {
    return { error: "Only the Super Admin can create locations." };
  }

  const fields = readLocationFields(formData);
  if (!fields.name) return { error: "Enter a location name." };
  if (!VALID_TYPES.includes(fields.type)) return { error: "Choose mosque or hostel." };

  const supabase = await createClient();
  const { error } = await supabase.from("locations").insert(fields);

  if (error) return { error: `Could not create the location: ${error.message}` };

  revalidatePath("/admin/locations");
  revalidatePath("/locations");
  revalidatePath("/");
  return { success: `${fields.name} created.` };
}

/** Renames or re-details a location. Hostel 7 becomes New Boys Hostel here. */
export async function updateLocation(
  _prev: LocationState,
  formData: FormData,
): Promise<LocationState> {
  try {
    await requireSuperAdmin("/admin/locations");
  } catch {
    return { error: "Only the Super Admin can edit locations." };
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "No location selected." };

  const fields = readLocationFields(formData);
  if (!fields.name) return { error: "Enter a location name." };
  if (!VALID_TYPES.includes(fields.type)) return { error: "Choose mosque or hostel." };

  const supabase = await createClient();
  const { error } = await supabase.from("locations").update(fields).eq("id", id);

  if (error) return { error: `Could not save the location: ${error.message}` };

  revalidatePath("/admin/locations");
  revalidatePath("/locations");
  revalidatePath(`/location/${id}`);
  revalidatePath("/");
  return { success: `${fields.name} updated.` };
}

/** Flips a location on or off the public board without losing its history. */
export async function toggleLocationActive(
  _prev: LocationState,
  formData: FormData,
): Promise<LocationState> {
  try {
    await requireSuperAdmin("/admin/locations");
  } catch {
    return { error: "Only the Super Admin can deactivate locations." };
  }

  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  if (!id) return { error: "No location selected." };

  const supabase = await createClient();
  const { error } = await supabase.from("locations").update({ active }).eq("id", id);
  if (error) return { error: `Could not update the location: ${error.message}` };

  revalidatePath("/admin/locations");
  revalidatePath("/locations");
  revalidatePath("/");
  return {
    success: active
      ? "Location is live on the public board again."
      : "Location hidden from the public board.",
  };
}

/**
 * Soft delete. Prayer history and audit records stay in the database, so a
 * removal never destroys the record of what a location used to publish.
 */
export async function softDeleteLocation(
  _prev: LocationState,
  formData: FormData,
): Promise<LocationState> {
  try {
    await requireSuperAdmin("/admin/locations");
  } catch {
    return { error: "Only the Super Admin can remove locations." };
  }

  const id = String(formData.get("id") ?? "");
  const confirmation = String(formData.get("confirm_name") ?? "").trim();
  const expectedName = String(formData.get("expected_name") ?? "").trim();

  if (!id) return { error: "No location selected." };
  if (confirmation !== expectedName) {
    return { error: `Type “${expectedName}” exactly to confirm the removal.` };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("locations")
    .update({ deleted_at: new Date().toISOString(), active: false })
    .eq("id", id);

  if (error) return { error: `Could not remove the location: ${error.message}` };

  revalidatePath("/admin/locations");
  revalidatePath("/locations");
  revalidatePath("/");
  return { success: `${expectedName} removed. Its timing history has been preserved.` };
}

/** Brings a soft-deleted location back. */
export async function restoreLocation(
  _prev: LocationState,
  formData: FormData,
): Promise<LocationState> {
  try {
    await requireSuperAdmin("/admin/locations");
  } catch {
    return { error: "Only the Super Admin can restore locations." };
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "No location selected." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("locations")
    .update({ deleted_at: null, active: true })
    .eq("id", id);

  if (error) return { error: `Could not restore the location: ${error.message}` };

  revalidatePath("/admin/locations");
  revalidatePath("/locations");
  revalidatePath("/");
  return { success: "Location restored." };
}
