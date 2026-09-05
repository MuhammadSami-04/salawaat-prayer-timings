import type { Metadata } from "next";

import { requireUser } from "@/lib/auth";
import { getAuditLogs } from "@/lib/queries";
import { AuditList } from "@/components/dashboard/AuditList";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Update History" };

export default async function HistoryPage() {
  const session = await requireUser("/dashboard/history");

  if (session.locations.length === 0) {
    return (
      <EmptyState
        title="No history to show"
        description="Once you are assigned a location, every change you make to it is recorded here."
      />
    );
  }

  // RLS restricts this to the caller's own locations; the explicit filter
  // keeps a Super Admin's authority view scoped the same way.
  const logs = await getAuditLogs({
    locationIds: session.locations.map((location) => location.id),
    limit: 150,
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
          Update history
        </h1>
        <p className="mt-1 text-sm text-muted">
          Every change to your locations, recorded automatically by the database.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {session.locations.length === 1
              ? session.locations[0].name
              : `${session.locations.length} locations`}
          </CardTitle>
          <span className="text-sm text-subtle">{logs.length} entries</span>
        </CardHeader>
        <CardBody className="p-0">
          <AuditList logs={logs} />
        </CardBody>
      </Card>
    </div>
  );
}
