"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { assertCanManage, requireUser } from "@/lib/auth";

export type AnnouncementState = { error?: string; success?: string } | null;

/** Posts an announcement against a location the user is allowed to manage. */
export async function createAnnouncement(
  _prev: AnnouncementState,
  formData: FormData,
): Promise<AnnouncementState> {
  const locationId = String(formData.get("location_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const expiresAt = String(formData.get("expires_at") ?? "").trim();

  if (!locationId) return { error: "No location selected." };
  if (!title) return { error: "Give the announcement a title." };
  if (!message) return { error: "Write the announcement message." };

  let session;
  try {
    session = await requireUser("/dashboard/announcements");
    assertCanManage(session, locationId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Not permitted." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").insert({
    location_id: locationId,
    title,
    message,
    // A date input gives a calendar day; expire at the end of it.
    expires_at: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
    created_by: session.profile.id,
  });

  if (error) {
    return {
      error:
        error.code === "42501"
          ? "You are not assigned to this location."
          : `Could not post the announcement: ${error.message}`,
    };
  }

  revalidatePath("/dashboard/announcements");
  revalidatePath(`/location/${locationId}`);
  return { success: "Announcement posted." };
}

export async function setAnnouncementActive(
  _prev: AnnouncementState,
  formData: FormData,
): Promise<AnnouncementState> {
  const id = String(formData.get("id") ?? "");
  const locationId = String(formData.get("location_id") ?? "");
  const active = formData.get("active") === "true";
  if (!id || !locationId) return { error: "Nothing to update." };

  try {
    const session = await requireUser("/dashboard/announcements");
    assertCanManage(session, locationId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Not permitted." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").update({ active }).eq("id", id);
  if (error) return { error: `Could not update: ${error.message}` };

  revalidatePath("/dashboard/announcements");
  revalidatePath(`/location/${locationId}`);
  return { success: active ? "Announcement shown again." : "Announcement hidden." };
}

export async function deleteAnnouncement(
  _prev: AnnouncementState,
  formData: FormData,
): Promise<AnnouncementState> {
  const id = String(formData.get("id") ?? "");
  const locationId = String(formData.get("location_id") ?? "");
  if (!id || !locationId) return { error: "Nothing to remove." };

  try {
    const session = await requireUser("/dashboard/announcements");
    assertCanManage(session, locationId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Not permitted." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) return { error: `Could not remove: ${error.message}` };

  revalidatePath("/dashboard/announcements");
  revalidatePath(`/location/${locationId}`);
  return { success: "Announcement removed." };
}
