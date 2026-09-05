"use client";

import { useActionState, useMemo, useState } from "react";

import {
  addAssignment,
  createAuthority,
  removeAssignment,
  type AuthorityState,
} from "@/app/actions/authorities";
import { createLocation, type LocationState } from "@/app/actions/locations";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { roleLabel } from "@/lib/roles";
import { emailToUsername, suggestUsername } from "@/lib/username";
import type { AuthorityWithLocations, LocationRow } from "@/lib/types";
import { cn } from "@/lib/utils";

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M10 4.5v11M4.5 10h11" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The Super Admin's home screen: who runs which mosque or hostel.
 *
 * Every location is a row, its assigned people are chips on that row, and
 * the "+" on the row adds another. A location can carry one, two, three or
 * more representatives — the board simply shows however many there are.
 */
export function AssignmentBoard({
  locations,
  authorities,
  canProvision,
}: {
  locations: LocationRow[];
  authorities: AuthorityWithLocations[];
  canProvision: boolean;
}) {
  const [addState, addAction] = useActionState<AuthorityState, FormData>(addAssignment, null);
  const [removeState, removeAction] = useActionState<AuthorityState, FormData>(
    removeAssignment,
    null,
  );
  const [createState, createAction] = useActionState<AuthorityState, FormData>(
    createAuthority,
    null,
  );
  const [locState, locAction] = useActionState<LocationState, FormData>(createLocation, null);

  const [assignTo, setAssignTo] = useState<LocationRow | null>(null);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [showNewLocation, setShowNewLocation] = useState(false);
  const [query, setQuery] = useState("");

  const notice = addState ?? removeState ?? createState ?? locState;

  /** location id -> the people assigned to it */
  const byLocation = useMemo(() => {
    const map = new Map<string, AuthorityWithLocations[]>();
    for (const authority of authorities) {
      for (const managed of authority.location_managers) {
        const list = map.get(managed.location_id) ?? [];
        list.push(authority);
        map.set(managed.location_id, list);
      }
    }
    return map;
  }, [authorities]);

  const needle = query.trim().toLowerCase();
  const visible = needle
    ? locations.filter((l) => l.name.toLowerCase().includes(needle))
    : locations;

  /** People not yet on the location being assigned to. */
  const assignable = assignTo
    ? authorities.filter(
        (a) => !a.location_managers.some((m) => m.location_id === assignTo.id),
      )
    : [];

  return (
    <div className="space-y-4">
      {notice?.error ? <Alert tone="danger">{notice.error}</Alert> : null}
      {notice?.success ? <Alert tone="success">{notice.success}</Alert> : null}

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search mosque or hostel…"
          aria-label="Search locations"
          className="h-11 min-w-0 flex-1 rounded-xl border border-border-strong bg-surface px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <Button variant="secondary" onClick={() => setShowNewLocation(true)}>
          <PlusIcon className="h-4 w-4" />
          Add location
        </Button>
        <Button
          onClick={() => {
            setAssignTo(null);
            setMode("new");
          }}
        >
          <PlusIcon className="h-4 w-4" />
          Add authority
        </Button>
      </div>

      {locations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-surface-muted/50 px-6 py-14 text-center">
          <p className="font-display text-lg font-semibold text-foreground">
            No mosques or hostels yet
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Add your first location, then assign the person who will keep its prayer timings up
            to date.
          </p>
          <Button className="mt-4" onClick={() => setShowNewLocation(true)}>
            <PlusIcon className="h-4 w-4" />
            Add location
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((location) => {
            const people = byLocation.get(location.id) ?? [];
            return (
              <li
                key={location.id}
                className="rounded-2xl border border-border-soft bg-surface px-4 py-3.5 card-shadow sm:px-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-base font-semibold text-foreground">
                        {location.name}
                      </p>
                      <Badge tone={location.type === "mosque" ? "primary" : "accent"}>
                        {location.type === "mosque" ? "Mosque" : "Hostel"}
                      </Badge>
                      {location.active ? null : <Badge tone="neutral">Hidden</Badge>}
                    </div>
                    {location.building ? (
                      <p className="mt-0.5 text-xs text-subtle">{location.building}</p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setAssignTo(location);
                      setMode(authorities.length > 0 ? "existing" : "new");
                    }}
                    aria-label={`Assign an authority to ${location.name}`}
                    className="flex h-9 items-center gap-1.5 rounded-xl border border-primary/30 bg-primary-soft px-3 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Assign
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {people.length === 0 ? (
                    <span className="rounded-lg bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning">
                      No authority assigned
                    </span>
                  ) : (
                    people.map((person) => (
                      <span
                        key={person.id}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs",
                          person.active
                            ? "border-border-strong bg-surface-muted text-foreground"
                            : "border-border-soft bg-surface text-subtle line-through",
                        )}
                      >
                        <span className="font-medium">
                          {person.full_name || person.email}
                        </span>
                        <form action={removeAction} className="contents">
                          <input type="hidden" name="user_id" value={person.id} />
                          <input type="hidden" name="location_id" value={location.id} />
                          <button
                            type="submit"
                            aria-label={`Remove ${person.full_name || person.email} from ${location.name}`}
                            className="text-subtle transition-colors hover:text-danger"
                          >
                            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4">
                              <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
                            </svg>
                          </button>
                        </form>
                      </span>
                    ))
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* ------------------ assign / create authority ------------------ */}
      <Modal
        open={assignTo !== null || mode === "new"}
        onClose={() => {
          setAssignTo(null);
          setMode("existing");
        }}
        title={assignTo ? `Assign to ${assignTo.name}` : "Add an authority"}
        description={
          assignTo
            ? "A location can have as many representatives as you need."
            : "Create an account and choose which locations it manages."
        }
      >
        {assignTo && authorities.length > 0 ? (
          <div className="mb-4 flex gap-1 rounded-xl bg-surface-muted p-1">
            {(
              [
                { key: "existing", label: "Existing person" },
                { key: "new", label: "New account" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setMode(tab.key)}
                className={cn(
                  "flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  mode === tab.key
                    ? "bg-surface text-foreground card-shadow"
                    : "text-muted hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : null}

        {assignTo && mode === "existing" ? (
          assignable.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              Everyone is already assigned here. Switch to “New account” to add someone.
            </p>
          ) : (
            <ul className="max-h-72 space-y-1 overflow-y-auto scrollbar-slim">
              {assignable.map((person) => (
                <li key={person.id}>
                  <form action={addAction}>
                    <input type="hidden" name="user_id" value={person.id} />
                    <input type="hidden" name="location_id" value={assignTo.id} />
                    <button
                      type="submit"
                      className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-muted"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {person.full_name || person.email}
                        </span>
                        <span className="block truncate text-xs text-subtle">
                          {emailToUsername(person.email)} · {roleLabel(person.role)}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-medium text-primary">Assign</span>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )
        ) : null}

        {mode === "new" ? (
          canProvision ? (
            <form action={createAction} className="space-y-3">
              {assignTo ? (
                <input type="hidden" name="location_ids" value={assignTo.id} />
              ) : null}

              <FormField label="Full name" htmlFor="ab_name">
                <Input id="ab_name" name="full_name" required placeholder="Qari Ahmed" />
              </FormField>

              <FormField
                label="Username"
                htmlFor="ab_username"
                hint="What they will type to sign in. Spaces are fine."
              >
                <Input
                  id="ab_username"
                  name="username"
                  required
                  autoCapitalize="none"
                  spellCheck={false}
                  defaultValue={assignTo ? suggestUsername(assignTo.name) : ""}
                  placeholder="Zakaria Authority"
                />
              </FormField>

              <FormField
                label="Password"
                htmlFor="ab_pw"
                hint="At least 8 characters. Share it privately with them."
              >
                <Input id="ab_pw" name="password" type="text" minLength={8} required autoComplete="off" />
              </FormField>

              <FormField label="Phone" htmlFor="ab_phone">
                <Input id="ab_phone" name="phone" placeholder="Optional" />
              </FormField>

              <FormField label="Role" htmlFor="ab_role">
                <Select
                  id="ab_role"
                  name="role"
                  defaultValue={
                    assignTo?.type === "hostel" ? "hostel_authority" : "mosque_authority"
                  }
                >
                  <option value="mosque_authority">Mosque Authority / Qari Sahab</option>
                  <option value="hostel_authority">Hostel Authority</option>
                  <option value="super_admin">Super Admin (full control)</option>
                </Select>
              </FormField>

              {assignTo ? (
                <p className="rounded-lg bg-primary-soft px-3 py-2 text-xs text-primary">
                  Will be assigned to <strong>{assignTo.name}</strong>.
                </p>
              ) : (
                <p className="text-xs text-subtle">
                  Assign locations from the “Assign” button on each location, or in Authorities.
                </p>
              )}

              <SubmitButton className="w-full" pendingLabel="Creating…">
                Create account
              </SubmitButton>
            </form>
          ) : (
            <Alert tone="warning" title="Account creation unavailable">
              Set <code>SUPABASE_SERVICE_ROLE_KEY</code> in <code>.env.local</code> to create
              logins.
            </Alert>
          )
        ) : null}
      </Modal>

      {/* ------------------------- add location ------------------------- */}
      <Modal
        open={showNewLocation}
        onClose={() => setShowNewLocation(false)}
        title="Add a mosque or hostel"
        description="It appears on the public board straight away."
      >
        <form action={locAction} className="space-y-3">
          <FormField label="Name" htmlFor="ab_loc_name">
            <Input id="ab_loc_name" name="name" required placeholder="Main University Mosque" />
          </FormField>

          <FormField label="Type" htmlFor="ab_loc_type">
            <Select id="ab_loc_type" name="type" defaultValue="mosque">
              <option value="mosque">Mosque</option>
              <option value="hostel">Hostel</option>
            </Select>
          </FormField>

          <FormField label="Building / area" htmlFor="ab_loc_building">
            <Input id="ab_loc_building" name="building" placeholder="Optional" />
          </FormField>

          <FormField label="Description" htmlFor="ab_loc_desc">
            <Textarea id="ab_loc_desc" name="description" maxLength={300} />
          </FormField>

          <input type="hidden" name="active" value="on" />

          <SubmitButton className="w-full" pendingLabel="Creating…">
            Create location
          </SubmitButton>
        </form>
      </Modal>
    </div>
  );
}
