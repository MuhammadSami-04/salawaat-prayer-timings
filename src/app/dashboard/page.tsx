import Link from "next/link";
import type { Metadata } from "next";

import { requireUser } from "@/lib/auth";
import { getTiming, getAuditLogs } from "@/lib/queries";
import { todayISO, formatLongDate, timeAgo } from "@/lib/date";
import { DAILY_PRAYERS, formatTime } from "@/lib/prayer";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { AuditList } from "@/components/dashboard/AuditList";
import { Alert } from "@/components/ui/Alert";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireUser();
  const { error } = await searchParams;
  const today = todayISO();

  // One board per assigned location, so the authority sees at a glance
  // which of their locations still needs today's timings entered.
  const boards = await Promise.all(
    session.locations.map(async (location) => ({
      location,
      timing: await getTiming(location.id, today),
    })),
  );

  const recentLogs = await getAuditLogs({
    locationIds: session.isSuperAdmin ? undefined : session.locations.map((l) => l.id),
    limit: 6,
  });

  const firstName = (session.profile.full_name || session.profile.email).split(" ")[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
          Welcome, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted">{formatLongDate(today)}</p>
      </div>

      {error === "admin-only" ? (
        <Alert tone="warning" title="Admin area">
          That page is restricted to the Super Admin.
        </Alert>
      ) : null}

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-foreground">
            My assigned locations
          </h2>
          <span className="text-sm text-subtle">
            {session.locations.length} assigned
          </span>
        </div>

        {session.locations.length === 0 ? (
          <EmptyState
            title="No locations assigned yet"
            description="The Super Admin has not assigned you to a mosque or hostel. Once they do, it will appear here."
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {boards.map(({ location, timing }) => (
              <li key={location.id}>
                <Card className="h-full">
                  <CardBody className="space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-display text-lg font-semibold text-foreground">
                          {location.name}
                        </p>
                        <p className="text-xs capitalize text-subtle">
                          {location.type}
                          {location.building ? ` · ${location.building}` : ""}
                        </p>
                      </div>
                      {timing ? (
                        <Badge tone="success">Published</Badge>
                      ) : (
                        <Badge tone="warning">Not set today</Badge>
                      )}
                    </div>

                    {timing ? (
                      <>
                        <dl className="grid grid-cols-5 gap-1 rounded-xl bg-surface-muted px-2 py-2.5 text-center">
                          {DAILY_PRAYERS.map((prayer) => (
                            <div key={prayer.key}>
                              <dt className="text-[10px] font-semibold uppercase tracking-wider text-subtle">
                                {prayer.label}
                              </dt>
                              <dd className="tnum mt-0.5 text-xs font-semibold text-foreground">
                                {formatTime(
                                  timing[`${prayer.key}_jamaat`] ??
                                    timing[`${prayer.key}_adhan`],
                                )}
                              </dd>
                            </div>
                          ))}
                        </dl>
                        <p className="text-xs text-subtle">
                          Updated {timeAgo(timing.updated_at)}
                        </p>
                      </>
                    ) : (
                      <p className="rounded-xl bg-warning-soft px-3 py-2.5 text-sm text-warning">
                        Today&apos;s timings have not been entered.
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <LinkButton
                        size="sm"
                        href={`/dashboard/timings?location=${location.id}`}
                      >
                        Edit today&apos;s timings
                      </LinkButton>
                      <LinkButton size="sm" variant="secondary" href={`/location/${location.id}`}>
                        Public view
                      </LinkButton>
                    </div>
                  </CardBody>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Recent updates</CardTitle>
          <Link
            href="/dashboard/history"
            className="text-sm font-medium text-primary underline underline-offset-4"
          >
            View full history
          </Link>
        </CardHeader>
        <CardBody className="p-0">
          <AuditList logs={recentLogs} />
        </CardBody>
      </Card>
    </div>
  );
}
