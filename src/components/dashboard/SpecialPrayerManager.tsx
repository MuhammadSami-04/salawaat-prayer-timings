"use client";

import { useActionState, useState } from "react";

import {
  deleteSpecialPrayer,
  saveSpecialPrayer,
  type SpecialPrayerState,
} from "@/app/actions/special-prayers";
import { SPECIAL_PRAYER_LABELS } from "@/components/public/SpecialPrayersPanel";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { formatShortDate, todayISO } from "@/lib/date";
import { formatTime, toInputTime } from "@/lib/prayer";
import type { LocationRow, SpecialPrayer } from "@/lib/types";

export function SpecialPrayerManager({
  location,
  prayers,
}: {
  location: LocationRow;
  prayers: SpecialPrayer[];
}) {
  const [saveState, saveAction] = useActionState<SpecialPrayerState, FormData>(
    saveSpecialPrayer,
    null,
  );
  const [deleteState, deleteAction] = useActionState<SpecialPrayerState, FormData>(
    deleteSpecialPrayer,
    null,
  );
  const [editing, setEditing] = useState<SpecialPrayer | null>(null);
  const [type, setType] = useState<string>("eid_fitr");

  const activeType = editing?.type ?? type;
  const isTaraweeh = activeType === "taraweeh";

  function startEdit(prayer: SpecialPrayer) {
    setEditing(prayer);
    setType(prayer.type);
    // Bring the form into view on a phone, where the list pushes it off screen.
    document.getElementById("special-prayer-form")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="space-y-4">
      {saveState?.error ? <Alert tone="danger">{saveState.error}</Alert> : null}
      {saveState?.success ? <Alert tone="success">{saveState.success}</Alert> : null}
      {deleteState?.error ? <Alert tone="danger">{deleteState.error}</Alert> : null}
      {deleteState?.success ? <Alert tone="success">{deleteState.success}</Alert> : null}

      <Card id="special-prayer-form">
        <CardHeader>
          <div>
            <CardTitle>{editing ? "Edit special prayer" : "Add a special prayer"}</CardTitle>
            <p className="mt-0.5 text-sm text-muted">
              For <span className="font-medium text-foreground">{location.name}</span>
            </p>
          </div>
          {editing ? (
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
              Cancel edit
            </Button>
          ) : null}
        </CardHeader>

        <CardBody>
          {/* `key` resets every field when switching between add and edit. */}
          <form
            key={editing?.id ?? "new"}
            action={saveAction}
            className="grid gap-4 sm:grid-cols-2"
          >
            <input type="hidden" name="location_id" value={location.id} />
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

            <FormField label="Type" htmlFor="type">
              <Select
                id="type"
                name="type"
                defaultValue={editing?.type ?? "eid_fitr"}
                onChange={(event) => setType(event.target.value)}
              >
                {Object.entries(SPECIAL_PRAYER_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Prayer time" htmlFor="prayer_time">
              <Input
                id="prayer_time"
                name="prayer_time"
                type="time"
                className="tnum"
                defaultValue={toInputTime(editing?.prayer_time)}
              />
            </FormField>

            <FormField
              label={isTaraweeh ? "Start date" : "Date"}
              htmlFor="date"
            >
              <Input
                id="date"
                name="date"
                type="date"
                required
                defaultValue={editing?.date ?? todayISO()}
              />
            </FormField>

            {isTaraweeh ? (
              <FormField label="End date" htmlFor="end_date" hint="Last night of Taraweeh.">
                <Input
                  id="end_date"
                  name="end_date"
                  type="date"
                  defaultValue={editing?.end_date ?? ""}
                />
              </FormField>
            ) : (
              <div className="hidden sm:block" aria-hidden />
            )}

            <FormField
              label="Rakah information"
              htmlFor="rakah"
              hint="Optional, e.g. “20 Rakah”."
              className="sm:col-span-2"
            >
              <Input id="rakah" name="rakah" defaultValue={editing?.rakah ?? ""} maxLength={80} />
            </FormField>

            <FormField label="Announcement" htmlFor="announcement" className="sm:col-span-2">
              <Textarea
                id="announcement"
                name="announcement"
                maxLength={400}
                defaultValue={editing?.announcement ?? ""}
                placeholder="Optional note shown with this prayer on the public board."
              />
            </FormField>

            <label className="flex items-center gap-2 text-sm text-foreground sm:col-span-2">
              <input
                type="checkbox"
                name="active"
                defaultChecked={editing ? editing.active : true}
                className="h-4 w-4 rounded border-border-strong accent-[var(--primary)]"
              />
              Show on the public board
            </label>

            <div className="sm:col-span-2">
              <SubmitButton>{editing ? "Save changes" : "Add special prayer"}</SubmitButton>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configured events</CardTitle>
          <span className="text-sm text-subtle">{prayers.length}</span>
        </CardHeader>
        <CardBody className="p-0">
          {prayers.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted">
              Nothing configured. The public board simply hides this section until you add
              something.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {prayers.map((prayer) => (
                <li
                  key={prayer.id}
                  className="flex flex-wrap items-start justify-between gap-3 px-5 py-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">
                        {SPECIAL_PRAYER_LABELS[prayer.type]}
                      </p>
                      {prayer.active ? null : <Badge tone="neutral">Hidden</Badge>}
                    </div>
                    <p className="mt-0.5 text-sm text-muted">
                      {prayer.end_date && prayer.end_date !== prayer.date
                        ? `${formatShortDate(prayer.date)} – ${formatShortDate(prayer.end_date)}`
                        : formatShortDate(prayer.date)}
                      {prayer.prayer_time ? ` · ${formatTime(prayer.prayer_time)}` : ""}
                      {prayer.rakah ? ` · ${prayer.rakah}` : ""}
                    </p>
                    {prayer.announcement ? (
                      <p className="mt-1 max-w-prose text-sm text-subtle">{prayer.announcement}</p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Button variant="secondary" size="sm" onClick={() => startEdit(prayer)}>
                      Edit
                    </Button>
                    <form action={deleteAction}>
                      <input type="hidden" name="id" value={prayer.id} />
                      <input type="hidden" name="location_id" value={location.id} />
                      <SubmitButton variant="ghost" size="sm" pendingLabel="Removing…">
                        Remove
                      </SubmitButton>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
