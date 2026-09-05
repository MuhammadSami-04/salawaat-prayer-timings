"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { assertCanManage, requireUser } from "@/lib/auth";
import { TIMING_FIELDS, toDbTime } from "@/lib/prayer";
import type { PrayerTiming } from "@/lib/types";
import { isValidISODate, shiftDate } from "@/lib/date";

export type TimingActionState = { error?: string; success?: string } | null;

/**
 * Saves a whole day's board for one location in a single upsert.
 *
 * Permission is checked twice on purpose: `assertCanManage` gives the user
 * a clear message, and the RLS policy on `prayer_timings` is what actually
 * stops a forged request. The audit trail is written by a database trigger,
 * so it cannot be skipped by any client.
 */
export async function saveTimings(
  _prev: TimingActionState,
  formData: FormData,
): Promise<TimingActionState> {
  const locationId = String(formData.get("location_id") ?? "");
  const date = String(formData.get("date") ?? "");

  if (!locationId) return { error: "No location selected." };
  if (!isValidISODate(date)) return { error: "Choose a valid date." };

  let session;
  try {
    session = await requireUser("/dashboard/timings");
    assertCanManage(session, locationId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Not permitted." };
  }

  const payload: Record<string, string | null> = {};
  for (const field of TIMING_FIELDS) {
    payload[field] = toDbTime(formData.get(field) as string | null);
  }

  const notes = String(formData.get("notes") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase.from("prayer_timings").upsert(
    {
      location_id: locationId,
      date,
      ...payload,
      notes: notes || null,
      updated_by: session.profile.id,
    },
    { onConflict: "location_id,date" },
  );

  if (error) {
    return {
      error:
        error.code === "42501"
          ? "You are not assigned to this location."
          : `Could not save the timings: ${error.message}`,
    };
  }

  revalidatePath("/dashboard/timings");
  revalidatePath("/dashboard/history");
  revalidatePath(`/location/${locationId}`);
  revalidatePath("/");

  return { success: "Prayer timings updated successfully." };
}

/**
 * Copies one day's board onto a range of following days — the practical way
 * to publish a week without retyping five prayers seven times.
 */
export async function copyTimingsForward(
  _prev: TimingActionState,
  formData: FormData,
): Promise<TimingActionState> {
  const locationId = String(formData.get("location_id") ?? "");
  const date = String(formData.get("date") ?? "");
  const days = Number(formData.get("days") ?? 0);

  if (!locationId || !isValidISODate(date)) return { error: "Choose a valid date." };
  if (!Number.isInteger(days) || days < 1 || days > 60) {
    return { error: "Copy forward between 1 and 60 days." };
  }

  let session;
  try {
    session = await requireUser("/dashboard/timings");
    assertCanManage(session, locationId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Not permitted." };
  }

  const supabase = await createClient();
  const { data: source, error: readError } = await supabase
    .from("prayer_timings")
    .select("*")
    .eq("location_id", locationId)
    .eq("date", date)
    .maybeSingle<PrayerTiming>();

  if (readError || !source) {
    return { error: "Save this day's timings before copying them forward." };
  }

  const rows = Array.from({ length: days }, (_, index) => {
    // shiftDate stays on calendar days, so a positive UTC offset cannot
    // slide the copied board back by one.
    const row: Record<string, unknown> = {
      location_id: locationId,
      date: shiftDate(date, index + 1),
      updated_by: session.profile.id,
      notes: source.notes,
    };
    for (const field of TIMING_FIELDS) {
      row[field] = source[field];
    }
    return row;
  });

  const { error } = await supabase
    .from("prayer_timings")
    .upsert(rows, { onConflict: "location_id,date" });

  if (error) return { error: `Could not copy the timings: ${error.message}` };

  revalidatePath("/dashboard/timings");
  revalidatePath(`/location/${locationId}`);

  return { success: `Copied to the next ${days} ${days === 1 ? "day" : "days"}.` };
}
