import { Card, CardBody } from "@/components/ui/Card";

/**
 * Shown instead of a crash when the app has not been pointed at a Supabase
 * project yet — the first-run experience for whoever deploys this.
 */
export function SetupNotice() {
  return (
    <Card className="mx-auto max-w-2xl">
      <CardBody className="space-y-4 px-6 py-8">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            Connect your Supabase project
          </h2>
          <p className="mt-1 text-sm text-muted">
            The application is running, but no database is configured yet. Add a{" "}
            <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">.env.local</code> file
            in the project root:
          </p>
        </div>

        <pre className="overflow-x-auto rounded-xl bg-surface-inverse p-4 text-xs leading-relaxed text-primary-foreground scrollbar-slim">
{`NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key`}
        </pre>

        <div className="text-sm text-muted">
          <p className="font-medium text-foreground">Then run the migrations in order:</p>
          <ol className="mt-1.5 list-inside list-decimal space-y-1">
            <li>
              <code className="text-xs">supabase/migrations/0001_schema.sql</code> — tables, triggers, audit logging
            </li>
            <li>
              <code className="text-xs">supabase/migrations/0002_rls.sql</code> — row level security
            </li>
            <li>
              <code className="text-xs">supabase/migrations/0003_seed.sql</code> — 4 mosques and 17 hostels of demo data
            </li>
          </ol>
          <p className="mt-3">
            Full instructions are in <code className="text-xs">supabase/README.md</code>.
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
