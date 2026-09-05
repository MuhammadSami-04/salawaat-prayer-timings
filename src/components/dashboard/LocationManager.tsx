"use client";

import { useActionState, useState } from "react";

import {
  createLocation,
  restoreLocation,
  softDeleteLocation,
  toggleLocationActive,
  updateLocation,
  type LocationState,
} from "@/app/actions/locations";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { LocationRow } from "@/lib/types";

/** Shared add / edit form. `location` present means we are editing. */
function LocationForm({
  location,
  action,
  submitLabel,
}: {
  location?: LocationRow;
  action: (payload: FormData) => void;
  submitLabel: string;
}) {
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {location ? <input type="hidden" name="id" value={location.id} /> : null}

      <FormField label="Location name" htmlFor={`name-${location?.id ?? "new"}`}>
        <Input
          id={`name-${location?.id ?? "new"}`}
          name="name"
          required
          maxLength={120}
          defaultValue={location?.name ?? ""}
          placeholder="Hostel 18"
        />
      </FormField>

      <FormField label="Type" htmlFor={`type-${location?.id ?? "new"}`}>
        <Select
          id={`type-${location?.id ?? "new"}`}
          name="type"
          defaultValue={location?.type ?? "hostel"}
        >
          <option value="mosque">Mosque</option>
          <option value="hostel">Hostel</option>
        </Select>
      </FormField>

      <FormField label="Building / area" htmlFor={`building-${location?.id ?? "new"}`}>
        <Input
          id={`building-${location?.id ?? "new"}`}
          name="building"
          maxLength={120}
          defaultValue={location?.building ?? ""}
          placeholder="Residential Block C"
        />
      </FormField>

      <FormField label="Contact" htmlFor={`contact-${location?.id ?? "new"}`}>
        <Input
          id={`contact-${location?.id ?? "new"}`}
          name="contact"
          maxLength={120}
          defaultValue={location?.contact ?? ""}
          placeholder="Warden office extension 2140"
        />
      </FormField>

      <FormField label="Description" htmlFor={`desc-${location?.id ?? "new"}`} className="sm:col-span-2">
        <Textarea
          id={`desc-${location?.id ?? "new"}`}
          name="description"
          maxLength={300}
          defaultValue={location?.description ?? ""}
        />
      </FormField>

      <FormField
        label="Sort order"
        htmlFor={`sort-${location?.id ?? "new"}`}
        hint="Lower numbers appear first in every list."
      >
        <Input
          id={`sort-${location?.id ?? "new"}`}
          name="sort_order"
          type="number"
          className="tnum"
          defaultValue={location?.sort_order ?? 0}
        />
      </FormField>

      <label className="flex items-end gap-2 pb-2.5 text-sm text-foreground">
        <input
          type="checkbox"
          name="active"
          defaultChecked={location ? location.active : true}
          className="h-4 w-4 rounded border-border-strong accent-[var(--primary)]"
        />
        Visible on the public board
      </label>

      <div className="sm:col-span-2">
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}

export function LocationManager({ locations }: { locations: LocationRow[] }) {
  const [createState, createAction] = useActionState<LocationState, FormData>(
    createLocation,
    null,
  );
  const [updateState, updateAction] = useActionState<LocationState, FormData>(
    updateLocation,
    null,
  );
  const [toggleState, toggleAction] = useActionState<LocationState, FormData>(
    toggleLocationActive,
    null,
  );
  const [deleteState, deleteAction] = useActionState<LocationState, FormData>(
    softDeleteLocation,
    null,
  );
  const [restoreState, restoreAction] = useActionState<LocationState, FormData>(
    restoreLocation,
    null,
  );

  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<LocationRow | null>(null);
  const [deleting, setDeleting] = useState<LocationRow | null>(null);
  const [query, setQuery] = useState("");

  const notice = createState ?? updateState ?? toggleState ?? deleteState ?? restoreState;

  const needle = query.trim().toLowerCase();
  const visible = needle
    ? locations.filter((l) => l.name.toLowerCase().includes(needle))
    : locations;

  const groups = [
    { title: "Mosques", items: visible.filter((l) => l.type === "mosque") },
    { title: "Hostels", items: visible.filter((l) => l.type === "hostel") },
  ];

  return (
    <div className="space-y-4">
      {notice?.error ? <Alert tone="danger">{notice.error}</Alert> : null}
      {notice?.success ? <Alert tone="success">{notice.success}</Alert> : null}

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search locations…"
          aria-label="Search locations"
          className="h-11 min-w-0 flex-1 rounded-xl border border-border-strong bg-surface px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <Button onClick={() => setShowAdd(true)}>Add location</Button>
      </div>

      {groups.map((group) => (
        <Card key={group.title}>
          <CardHeader>
            <CardTitle>{group.title}</CardTitle>
            <span className="text-sm text-subtle">{group.items.length}</span>
          </CardHeader>
          <CardBody className="p-0">
            {group.items.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted">
                No {group.title.toLowerCase()} to show.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {group.items.map((location) => {
                  const isDeleted = location.deleted_at !== null;
                  return (
                    <li
                      key={location.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-foreground">{location.name}</p>
                          {isDeleted ? (
                            <Badge tone="danger">Removed</Badge>
                          ) : location.active ? (
                            <Badge tone="success">Active</Badge>
                          ) : (
                            <Badge tone="neutral">Hidden</Badge>
                          )}
                        </div>
                        {location.building || location.description ? (
                          <p className="mt-0.5 truncate text-sm text-subtle">
                            {location.building}
                            {location.building && location.description ? " · " : ""}
                            {location.description}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        {isDeleted ? (
                          <form action={restoreAction}>
                            <input type="hidden" name="id" value={location.id} />
                            <SubmitButton variant="secondary" size="sm" pendingLabel="…">
                              Restore
                            </SubmitButton>
                          </form>
                        ) : (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setEditing(location)}
                            >
                              Edit
                            </Button>
                            <form action={toggleAction}>
                              <input type="hidden" name="id" value={location.id} />
                              <input
                                type="hidden"
                                name="active"
                                value={location.active ? "false" : "true"}
                              />
                              <SubmitButton variant="ghost" size="sm" pendingLabel="…">
                                {location.active ? "Deactivate" : "Activate"}
                              </SubmitButton>
                            </form>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-danger"
                              onClick={() => setDeleting(location)}
                            >
                              Remove
                            </Button>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      ))}

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add location"
        description="It appears on the public board immediately if it is active."
      >
        <LocationForm action={createAction} submitLabel="Create location" />
      </Modal>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={`Edit ${editing?.name ?? "location"}`}
        description="Renaming updates the name everywhere in the application."
      >
        {editing ? (
          <LocationForm
            key={editing.id}
            location={editing}
            action={updateAction}
            submitLabel="Save changes"
          />
        ) : null}
      </Modal>

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={`Remove ${deleting?.name ?? "location"}?`}
        description="This is a soft delete — prayer history and audit records are kept, and the location can be restored."
      >
        {deleting ? (
          <form action={deleteAction} className="space-y-4">
            <input type="hidden" name="id" value={deleting.id} />
            <input type="hidden" name="expected_name" value={deleting.name} />
            <FormField
              label={`Type “${deleting.name}” to confirm`}
              htmlFor="confirm_name"
            >
              <Input id="confirm_name" name="confirm_name" autoComplete="off" required />
            </FormField>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setDeleting(null)}>
                Cancel
              </Button>
              <SubmitButton variant="danger" pendingLabel="Removing…">
                Remove location
              </SubmitButton>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
