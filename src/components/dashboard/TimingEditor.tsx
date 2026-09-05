"use client";

import { useActionState } from "react";

import { saveTimings, copyTimingsForward, type TimingActionState } from "@/app/actions/timings";
import { DAILY_PRAYERS, JUMMA_FIELDS, toInputTime } from "@/lib/prayer";
import { formatLongDate, isFridayISO } from "@/lib/date";
import type { LocationRow, PrayerTiming } from "@/lib/types";
import { Alert } from "@/components/ui/Alert";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Textarea } from "@/components/ui/Field";

/**
 * Bulk editor: every prayer for one location on one date, saved together.
 *
 * The location being edited is stated prominently above the fields, since
 * an authority with several assignments could otherwise overwrite the
 * wrong board by accident.
 */
export function TimingEditor({
  location,
  date,
  timing,
}: {
  location: LocationRow;
  date: string;
  timing: PrayerTiming | null;
}) {
  const [state, formAction] = useActionState<TimingActionState, FormData>(saveTimings, null);
  const [copyState, copyAction] = useActionState<TimingActionState, FormData>(
    copyTimingsForward,
    null,
  );

  const showJumma = isFridayISO(date) || JUMMA_FIELDS.some((field) => timing?.[field]);

  return (
    <div className="space-y-4">
      {/* The confirmation banner the brief asks for, before any field. */}
      <div className="rounded-2xl border-l-4 border-l-accent border-y border-r border-border-soft bg-accent-soft px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-foreground/70">
          You are editing
        </p>
        <p className="font-display text-xl font-semibold text-accent-foreground sm:text-2xl">
          {location.name}
        </p>
        <p className="mt-0.5 text-sm text-accent-foreground/80">{formatLongDate(date)}</p>
      </div>

      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state?.success ? <Alert tone="success">{state.success}</Alert> : null}

      <form action={formAction}>
        <input type="hidden" name="location_id" value={location.id} />
        <input type="hidden" name="date" value={date} />

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Daily prayers</CardTitle>
              <p className="mt-0.5 text-sm text-muted">
                Leave a field empty to hide it from the public board.
              </p>
            </div>
          </CardHeader>

          <CardBody className="space-y-0 p-0">
            {/* Column headers, desktop only */}
            <div className="hidden grid-cols-[1fr_11rem_11rem] gap-4 border-b border-border-soft bg-surface-muted px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-subtle sm:grid">
              <span>Prayer</span>
              <span>Adhan</span>
              <span>Jamaat</span>
            </div>

            {DAILY_PRAYERS.map((prayer) => (
              <div
                key={prayer.key}
                className="grid gap-3 border-b border-border-soft px-5 py-4 last:border-b-0 sm:grid-cols-[1fr_11rem_11rem] sm:items-center sm:gap-4"
              >
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-base font-semibold text-foreground">
                    {prayer.label}
                  </span>
                  <span className="text-sm text-subtle" lang="ar" dir="rtl">
                    {prayer.arabic}
                  </span>
                </div>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted sm:sr-only">
                    {prayer.label} Adhan
                  </span>
                  <input
                    type="time"
                    name={`${prayer.key}_adhan`}
                    defaultValue={toInputTime(timing?.[`${prayer.key}_adhan`])}
                    className="tnum h-11 w-full rounded-xl border border-border-strong bg-surface px-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted sm:sr-only">
                    {prayer.label} Jamaat
                  </span>
                  <input
                    type="time"
                    name={`${prayer.key}_jamaat`}
                    defaultValue={toInputTime(timing?.[`${prayer.key}_jamaat`])}
                    className="tnum h-11 w-full rounded-xl border border-border-strong bg-surface px-3 text-base font-medium focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <div>
              <CardTitle>Jumma</CardTitle>
              <p className="mt-0.5 text-sm text-muted">
                {showJumma
                  ? "Kept separate from Zuhr. Fill only the congregations you hold."
                  : "This date is not a Friday — set these only if you publish Jumma in advance."}
              </p>
            </div>
          </CardHeader>
          <CardBody className="grid gap-4 sm:grid-cols-3">
            {JUMMA_FIELDS.map((field, index) => (
              <label key={field} className="block">
                <span className="mb-1.5 block text-sm font-medium text-foreground">
                  Jumma {index + 1}
                  {index > 0 ? <span className="text-subtle"> (optional)</span> : null}
                </span>
                <input
                  type="time"
                  name={field}
                  defaultValue={toInputTime(timing?.[field])}
                  className="tnum h-11 w-full rounded-xl border border-border-strong bg-surface px-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
            ))}
          </CardBody>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Note for students</CardTitle>
          </CardHeader>
          <CardBody>
            <Textarea
              name="notes"
              defaultValue={timing?.notes ?? ""}
              maxLength={400}
              placeholder="Optional — shown under the timings on the public board."
            />
          </CardBody>
        </Card>

        <div className="sticky bottom-0 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-soft bg-surface px-4 py-3 card-shadow">
          <p className="text-sm text-muted">
            Saving records an entry in the update history.
          </p>
          <SubmitButton size="lg" pendingLabel="Saving…">
            Save All Changes
          </SubmitButton>
        </div>
      </form>

      {/* Copying forward is its own form so it never submits the editor. */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Copy to following days</CardTitle>
            <p className="mt-0.5 text-sm text-muted">
              Publish the same board for the days ahead. Existing days are overwritten.
            </p>
          </div>
        </CardHeader>
        <CardBody className="space-y-3">
          {copyState?.error ? <Alert tone="danger">{copyState.error}</Alert> : null}
          {copyState?.success ? <Alert tone="success">{copyState.success}</Alert> : null}

          <form action={copyAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="location_id" value={location.id} />
            <input type="hidden" name="date" value={date} />
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-foreground">
                Number of days
              </span>
              <input
                type="number"
                name="days"
                min={1}
                max={60}
                defaultValue={6}
                className="tnum h-11 w-28 rounded-xl border border-border-strong bg-surface px-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <SubmitButton variant="secondary" pendingLabel="Copying…">
              Copy forward
            </SubmitButton>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
