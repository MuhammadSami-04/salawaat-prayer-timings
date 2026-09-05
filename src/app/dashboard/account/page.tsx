import type { Metadata } from "next";

import { requireUser } from "@/lib/auth";
import { roleLabel } from "@/lib/roles";
import { emailToUsername } from "@/lib/username";
import { ChangePasswordForm } from "@/components/dashboard/ChangePasswordForm";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";

export const metadata: Metadata = { title: "My Account" };

export default async function AccountPage() {
  const session = await requireUser("/dashboard/account");
  const username = emailToUsername(session.profile.email);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
          My account
        </h1>
        <p className="mt-1 text-sm text-muted">
          Your sign-in details and the locations you manage.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardBody>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-subtle">
                Username
              </dt>
              <dd className="mt-0.5 font-medium text-foreground">{username}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-subtle">Name</dt>
              <dd className="mt-0.5 text-foreground">{session.profile.full_name || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-subtle">Role</dt>
              <dd className="mt-0.5 text-foreground">{roleLabel(session.profile.role)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-subtle">
                Contact
              </dt>
              <dd className="mt-0.5 text-foreground">{session.profile.phone || "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wider text-subtle">
                Assigned locations
              </dt>
              <dd className="mt-0.5 text-foreground">
                {session.isSuperAdmin
                  ? "All locations (Super Admin)"
                  : session.locations.length === 0
                    ? "None yet"
                    : session.locations.map((l) => l.name).join(", ")}
              </dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      <ChangePasswordForm />
    </div>
  );
}
