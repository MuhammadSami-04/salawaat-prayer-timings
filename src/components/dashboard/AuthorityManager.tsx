"use client";

import { useActionState, useMemo, useState } from "react";

import {
  createAuthority,
  deleteAuthority,
  setAuthorityActive,
  setAuthorityLocations,
  updateAuthority,
  type AuthorityState,
} from "@/app/actions/authorities";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { FormField, Input, Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { roleLabel } from "@/lib/roles";
import { emailToUsername } from "@/lib/username";
import type { AuthorityWithLocations, LocationRow } from "@/lib/types";

/**
 * Checkbox list of every location. Any number may be ticked, which is how
 * one mosque ends up with four Qari Sahabs and one person can cover two
 * hostels — no fixed limits anywhere.
 */
function LocationCheckboxes({
  locations,
  selectedIds,
}: {
  locations: LocationRow[];
  selectedIds: string[];
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const filtered = needle
    ? locations.filter((l) => l.name.toLowerCase().includes(needle))
    : locations;

  const groups = [
    { title: "Mosques", items: filtered.filter((l) => l.type === "mosque") },
    { title: "Hostels", items: filtered.filter((l) => l.type === "hostel") },
  ].filter((group) => group.items.length > 0);

  return (
    <div className="rounded-xl border border-border-strong">
      <div className="border-b border-border-soft p-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter locations…"
          aria-label="Filter locations"
          className="h-9 w-full rounded-lg border border-border-strong bg-surface px-2.5 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      <div className="max-h-56 overflow-y-auto scrollbar-slim p-2">
        {groups.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-muted">No matching location.</p>
        ) : (
          groups.map((group) => (
            <div key={group.title} className="mb-2 last:mb-0">
              <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-subtle">
                {group.title}
              </p>
              {group.items.map((location) => (
                <label
                  key={location.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-muted"
                >
                  <input
                    type="checkbox"
                    name="location_ids"
                    value={location.id}
                    defaultChecked={selectedIds.includes(location.id)}
                    className="h-4 w-4 rounded border-border-strong accent-[var(--primary)]"
                  />
                  <span className="text-foreground">{location.name}</span>
                  {!location.active ? (
                    <span className="text-xs text-subtle">(hidden)</span>
                  ) : null}
                </label>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function AuthorityManager({
  authorities,
  locations,
  currentUserId,
}: {
  authorities: AuthorityWithLocations[];
  locations: LocationRow[];
  currentUserId: string;
}) {
  const [createState, createAction] = useActionState<AuthorityState, FormData>(
    createAuthority,
    null,
  );
  const [assignState, assignAction] = useActionState<AuthorityState, FormData>(
    setAuthorityLocations,
    null,
  );
  const [editState, editAction] = useActionState<AuthorityState, FormData>(updateAuthority, null);
  const [activeState, activeAction] = useActionState<AuthorityState, FormData>(
    setAuthorityActive,
    null,
  );
  const [deleteState, deleteAction] = useActionState<AuthorityState, FormData>(
    deleteAuthority,
    null,
  );

  const [showCreate, setShowCreate] = useState(false);
  const [assigning, setAssigning] = useState<AuthorityWithLocations | null>(null);
  const [editing, setEditing] = useState<AuthorityWithLocations | null>(null);
  const [deleting, setDeleting] = useState<AuthorityWithLocations | null>(null);
  const [query, setQuery] = useState("");

  const notice = createState ?? assignState ?? editState ?? activeState ?? deleteState;

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return authorities;
    return authorities.filter(
      (authority) =>
        authority.full_name.toLowerCase().includes(needle) ||
        emailToUsername(authority.email).toLowerCase().includes(needle) ||
        authority.location_managers.some((m) =>
          (m.locations?.name ?? "").toLowerCase().includes(needle),
        ),
    );
  }, [authorities, query]);

  function assignedIds(authority: AuthorityWithLocations) {
    return authority.location_managers.map((m) => m.location_id);
  }

  return (
    <div className="space-y-4">
      {notice?.error ? <Alert tone="danger">{notice.error}</Alert> : null}
      {notice?.success ? <Alert tone="success">{notice.success}</Alert> : null}

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, email or location…"
          aria-label="Search authorities"
          className="h-11 min-w-0 flex-1 rounded-xl border border-border-strong bg-surface px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <Button onClick={() => setShowCreate(true)}>Create authority</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Authorities</CardTitle>
          <span className="text-sm text-subtle">{rows.length}</span>
        </CardHeader>
        <CardBody className="p-0">
          {rows.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted">
              No authority accounts yet. Create one to hand out timing access.
            </p>
          ) : (
            <>
              {/* Table on desktop */}
              <table className="hidden w-full text-left text-sm md:table">
                <thead className="border-b border-border-soft bg-surface-muted text-xs uppercase tracking-wider text-subtle">
                  <tr>
                    <th scope="col" className="px-5 py-2.5 font-semibold">Name</th>
                    <th scope="col" className="px-5 py-2.5 font-semibold">Role</th>
                    <th scope="col" className="px-5 py-2.5 font-semibold">Assigned locations</th>
                    <th scope="col" className="px-5 py-2.5 font-semibold">Status</th>
                    <th scope="col" className="px-5 py-2.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {rows.map((authority) => (
                    <tr key={authority.id}>
                      <td className="px-5 py-3.5 align-top">
                        <p className="font-medium text-foreground">{authority.full_name || "—"}</p>
                        <p className="text-xs text-subtle">{emailToUsername(authority.email)}</p>
                      </td>
                      <td className="px-5 py-3.5 align-top text-muted">
                        {roleLabel(authority.role)}
                      </td>
                      <td className="px-5 py-3.5 align-top">
                        {authority.location_managers.length === 0 ? (
                          <span className="text-subtle">Unassigned</span>
                        ) : (
                          <span className="flex flex-wrap gap-1">
                            {authority.location_managers.map((m) => (
                              <Badge key={m.location_id} tone="primary">
                                {m.locations?.name ?? "Removed"}
                              </Badge>
                            ))}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 align-top">
                        {authority.active ? (
                          <Badge tone="success">Active</Badge>
                        ) : (
                          <Badge tone="neutral">Disabled</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3.5 align-top">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setAssigning(authority)}
                          >
                            Assign
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditing(authority)}>
                            Edit
                          </Button>
                          <form action={activeAction}>
                            <input type="hidden" name="user_id" value={authority.id} />
                            <input
                              type="hidden"
                              name="active"
                              value={authority.active ? "false" : "true"}
                            />
                            <SubmitButton variant="ghost" size="sm" pendingLabel="…">
                              {authority.active ? "Disable" : "Enable"}
                            </SubmitButton>
                          </form>
                          {authority.id === currentUserId ? null : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-danger"
                              onClick={() => setDeleting(authority)}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Cards on mobile */}
              <ul className="divide-y divide-[var(--border)] md:hidden">
                {rows.map((authority) => (
                  <li key={authority.id} className="space-y-2.5 px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{authority.full_name || "—"}</p>
                        <p className="truncate text-xs text-subtle">{emailToUsername(authority.email)}</p>
                        <p className="mt-0.5 text-xs text-muted">{roleLabel(authority.role)}</p>
                      </div>
                      {authority.active ? (
                        <Badge tone="success">Active</Badge>
                      ) : (
                        <Badge tone="neutral">Disabled</Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {authority.location_managers.length === 0 ? (
                        <span className="text-xs text-subtle">Unassigned</span>
                      ) : (
                        authority.location_managers.map((m) => (
                          <Badge key={m.location_id} tone="primary">
                            {m.locations?.name ?? "Removed"}
                          </Badge>
                        ))
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <Button variant="secondary" size="sm" onClick={() => setAssigning(authority)}>
                        Assign
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditing(authority)}>
                        Edit
                      </Button>
                      <form action={activeAction}>
                        <input type="hidden" name="user_id" value={authority.id} />
                        <input
                          type="hidden"
                          name="active"
                          value={authority.active ? "false" : "true"}
                        />
                        <SubmitButton variant="ghost" size="sm" pendingLabel="…">
                          {authority.active ? "Disable" : "Enable"}
                        </SubmitButton>
                      </form>
                      {authority.id === currentUserId ? null : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger"
                          onClick={() => setDeleting(authority)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardBody>
      </Card>

      {/* ---------------------------- create ---------------------------- */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create authority account"
        description="The person can sign in immediately with the password you set here."
      >
        <form action={createAction} className="space-y-4">
          <FormField label="Full name" htmlFor="full_name">
            <Input id="full_name" name="full_name" required placeholder="Qari Ahmed" />
          </FormField>

          <FormField
            label="Username"
            htmlFor="new_username"
            hint="What they type to sign in, e.g. “Zakaria Authority”."
          >
            <Input
              id="new_username"
              name="username"
              required
              autoCapitalize="none"
              spellCheck={false}
              placeholder="Zakaria Authority"
            />
          </FormField>

          <FormField
            label="Temporary password"
            htmlFor="new_password"
            hint="At least 8 characters. Share it privately and ask them to change it."
          >
            <Input
              id="new_password"
              name="password"
              type="text"
              minLength={8}
              required
              autoComplete="off"
            />
          </FormField>

          <FormField label="Phone" htmlFor="new_phone">
            <Input id="new_phone" name="phone" placeholder="Optional" />
          </FormField>

          <FormField label="Role" htmlFor="new_role">
            <Select id="new_role" name="role" defaultValue="mosque_authority">
              <option value="mosque_authority">Mosque Authority / Qari Sahab</option>
              <option value="hostel_authority">Hostel Authority</option>
              <option value="super_admin">Super Admin</option>
            </Select>
          </FormField>

          <div>
            <p className="mb-1.5 text-sm font-medium text-foreground">Assign locations</p>
            <LocationCheckboxes locations={locations} selectedIds={[]} />
            <p className="mt-1 text-xs text-subtle">
              A location can have as many authorities as you need.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <SubmitButton pendingLabel="Creating…">Create account</SubmitButton>
          </div>
        </form>
      </Modal>

      {/* ---------------------------- assign ---------------------------- */}
      <Modal
        open={assigning !== null}
        onClose={() => setAssigning(null)}
        title={`Assign ${assigning?.full_name || "authority"}`}
        description="Ticked locations are the only ones this person can edit."
      >
        {assigning ? (
          <form key={assigning.id} action={assignAction} className="space-y-4">
            <input type="hidden" name="user_id" value={assigning.id} />
            <LocationCheckboxes locations={locations} selectedIds={assignedIds(assigning)} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setAssigning(null)}>
                Cancel
              </Button>
              <SubmitButton pendingLabel="Saving…">Save assignments</SubmitButton>
            </div>
          </form>
        ) : null}
      </Modal>

      {/* ----------------------------- edit ----------------------------- */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={`Edit ${editing?.full_name || "authority"}`}
      >
        {editing ? (
          <form key={editing.id} action={editAction} className="space-y-4">
            <input type="hidden" name="user_id" value={editing.id} />

            <FormField label="Full name" htmlFor="edit_name">
              <Input id="edit_name" name="full_name" required defaultValue={editing.full_name} />
            </FormField>

            <FormField label="Phone" htmlFor="edit_phone">
              <Input id="edit_phone" name="phone" defaultValue={editing.phone ?? ""} />
            </FormField>

            <FormField label="Role" htmlFor="edit_role">
              <Select id="edit_role" name="role" defaultValue={editing.role}>
                <option value="mosque_authority">Mosque Authority / Qari Sahab</option>
                <option value="hostel_authority">Hostel Authority</option>
                <option value="super_admin">Super Admin</option>
              </Select>
            </FormField>

            <p className="text-xs text-subtle">
              Username is “{emailToUsername(editing.email)}”. Usernames cannot be changed after creation.
            </p>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
            </div>
          </form>
        ) : null}
      </Modal>

      {/* ---------------------------- delete ---------------------------- */}
      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={`Delete ${deleting?.full_name || "authority"}?`}
        description="Their login is removed permanently. Past changes stay in the audit log. Disabling the account instead keeps it recoverable."
      >
        {deleting ? (
          <form action={deleteAction} className="flex justify-end gap-2">
            <input type="hidden" name="user_id" value={deleting.id} />
            <Button type="button" variant="secondary" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <SubmitButton variant="danger" pendingLabel="Deleting…">
              Delete account
            </SubmitButton>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
