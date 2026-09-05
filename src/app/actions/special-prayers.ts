"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { assertCanManage, requireUser } from "@/lib/auth";
import { toDbTime } from "@/lib/prayer";
import { isValidISODate } from "@/lib/date";
import type { SpecialPrayerType } from "@/lib/types";

export type SpecialPrayerState = { error?: string; success?: string } | null;

const VALID_TYPES: SpecialPrayerType[] = ["eid_fitr", "eid_adha", "taraweeh"];

/** Creates or updates one Eid / Taraweeh entry for a location. */
export async function saveSpecialPrayer(
  _prev: SpecialPrayerState,
  formData: FormData,
): Promise<SpecialPrayerState> {
  const id = String(formData.get("id") ?? "").trim();
  const locationId = String(formData.get("location_id") ?? "");
  const type = String(formData.get("type") ?? "") as SpecialPrayerType;
  const date = String(formData.get("date") ?? "");
  const endDate = String(formData.get("end_date") ?? "").trim();

  if (!locationId) return { error: "No location selected." };
  if (!VALID_TYPES.includes(type)) return { error: "Choose a valid prayer type." };
  if (!isValidISODate(date)) return { error: "Choose a valid date." };
  if (endDate && !isValidISODate(endDate)) return { error: "Choose a valid end date." };
  if (endDate && endDate < date) return { error: "The end date cannot be before the start date." };

  let session;
  try {
    session = await requireUser("/dashboard/special-prayers");
    assertCanManage(session, locationId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Not permitted." };
  }

  const row = {
    location_id: locationId,
    type,
    date,
    end_date: type === "taraweeh" && endDate ? endDate : null,
    prayer_time: toDbTime(formData.get("prayer_time") as string | null),
    rakah: String(formData.get("rakah") ?? "").trim() || null,
    announcement: String(formData.get("announcement") ?? "").trim() || null,
    active: formData.get("active") !== null,
    updated_by: session.profile.id,
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("special_prayers").update(row).eq("id", id)
    : await supabase.from("special_prayers").insert(row);

  if (error) {
    return {
      error:
        error.code === "42501"
          ? "You are not assigned to this location."
          : `Could not save: ${error.message}`,
    };
  }

  revalidatePath("/dashboard/special-prayers");
  revalidatePath(`/location/${locationId}`);

  return { success: id ? "Special prayer updated." : "Special prayer added." };
}

export async function deleteSpecialPrayer(
  _prev: SpecialPrayerState,
  formData: FormData,
): Promise<SpecialPrayerState> {
  const id = String(formData.get("id") ?? "");
  const locationId = String(formData.get("location_id") ?? "");
  if (!id || !locationId) return { error: "Nothing to remove." };

  try {
    const session = await requireUser("/dashboard/special-prayers");
    assertCanManage(session, locationId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Not permitted." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("special_prayers").delete().eq("id", id);
  if (error) return { error: `Could not remove: ${error.message}` };

  revalidatePath("/dashboard/special-prayers");
  revalidatePath(`/location/${locationId}`);
  return { success: "Special prayer removed." };
}
