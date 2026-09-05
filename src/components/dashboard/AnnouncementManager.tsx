"use client";

import { useActionState } from "react";

import {
  createAnnouncement,
  deleteAnnouncement,
  setAnnouncementActive,
  type AnnouncementState,
} from "@/app/actions/announcements";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { FormField, Input, Textarea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { timeAgo, formatShortDate } from "@/lib/date";
import type { Announcement, LocationRow } from "@/lib/types";

export function AnnouncementManager({
  location,
  announcements,
}: {
  location: LocationRow;
  announcements: Announcement[];
}) {
  const [createState, createAction] = useActionState<AnnouncementState, FormData>(
    createAnnouncement,
    null,
  );
  const [toggleState, toggleAction] = useActionState<AnnouncementState, FormData>(
    setAnnouncementActive,
    null,
  );
  const [deleteState, deleteAction] = useActionState<AnnouncementState, FormData>(
    deleteAnnouncement,
    null,
  );

  const notice = createState ?? toggleState ?? deleteState;

  return (
    <div className="space-y-4">
      {notice?.error ? <Alert tone="danger">{notice.error}</Alert> : null}
      {notice?.success ? <Alert tone="success">{notice.success}</Alert> : null}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>New announcement</CardTitle>
            <p className="mt-0.5 text-sm text-muted">
              Posted to <span className="font-medium text-foreground">{location.name}</span> only.
            </p>
          </div>
        </CardHeader>
        <CardBody>
          <form
            key={announcements.length}
            action={createAction}
            className="grid gap-4 sm:grid-cols-2"
          >
            <input type="hidden" name="location_id" value={location.id} />

            <FormField label="Title" htmlFor="title">
              <Input
                id="title"
                name="title"
                required
                maxLength={120}
                placeholder="Fajr Jamaat timing changed"
              />
            </FormField>

            <FormField
              label="Hide after"
              htmlFor="expires_at"
              hint="Optional — leave empty to keep it up until you remove it."
            >
              <Input id="expires_at" name="expires_at" type="date" />
            </FormField>

            <FormField label="Message" htmlFor="message" className="sm:col-span-2">
              <Textarea
                id="message"
                name="message"
                required
                maxLength={500}
                placeholder="Fajr Jamaat timing has been changed to 5:15 AM from tomorrow."
              />
            </FormField>

            <div className="sm:col-span-2">
              <SubmitButton pendingLabel="Posting…">Post announcement</SubmitButton>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Posted announcements</CardTitle>
          <span className="text-sm text-subtle">{announcements.length}</span>
        </CardHeader>
        <CardBody className="p-0">
          {announcements.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted">
              No announcements yet.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {announcements.map((announcement) => {
                const expired =
                  announcement.expires_at !== null &&
                  new Date(announcement.expires_at).getTime() < Date.now();

                return (
                  <li
                    key={announcement.id}
                    className="flex flex-wrap items-start justify-between gap-3 px-5 py-4"
                  >
                    <div className="min-w-0 max-w-prose">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{announcement.title}</p>
                        {!announcement.active ? <Badge tone="neutral">Hidden</Badge> : null}
                        {expired ? <Badge tone="warning">Expired</Badge> : null}
                      </div>
                      <p className="mt-1 text-sm text-muted">{announcement.message}</p>
                      <p className="mt-1 text-xs text-subtle">
                        Posted {timeAgo(announcement.created_at)}
                        {announcement.expires_at
                          ? ` · hides ${formatShortDate(announcement.expires_at.slice(0, 10))}`
                          : ""}
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <form action={toggleAction}>
                        <input type="hidden" name="id" value={announcement.id} />
                        <input type="hidden" name="location_id" value={location.id} />
                        <input
                          type="hidden"
                          name="active"
                          value={announcement.active ? "false" : "true"}
                        />
                        <SubmitButton variant="secondary" size="sm" pendingLabel="…">
                          {announcement.active ? "Hide" : "Show"}
                        </SubmitButton>
                      </form>

                      <form action={deleteAction}>
                        <input type="hidden" name="id" value={announcement.id} />
                        <input type="hidden" name="location_id" value={location.id} />
                        <SubmitButton variant="ghost" size="sm" pendingLabel="…">
                          Remove
                        </SubmitButton>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
