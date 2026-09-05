import type { Metadata } from "next";

import { requireSuperAdmin } from "@/lib/auth";
import { getAuditLogs } from "@/lib/queries";
import { AuditList } from "@/components/dashboard/AuditList";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Audit Logs" };

export default async function AdminLogsPage() {
  await requireSuperAdmin("/admin/logs");

  // No location filter — the Super Admin sees every change in the system.
  const logs = await getAuditLogs({ limit: 300 });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
          Audit logs
        </h1>
        <p className="mt-1 text-sm text-muted">
          Every timing, announcement and location change across the university, written by the
          database and immutable once recorded.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All activity</CardTitle>
          <span className="text-sm text-subtle">
            {logs.length === 300 ? "latest 300 entries" : `${logs.length} entries`}
          </span>
        </CardHeader>
        <CardBody className="p-0">
          <AuditList logs={logs} />
        </CardBody>
      </Card>
    </div>
  );
}
