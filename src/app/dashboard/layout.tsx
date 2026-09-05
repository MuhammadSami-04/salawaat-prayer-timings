import { AUTHORITY_NAV, DashboardShell } from "@/components/dashboard/DashboardShell";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser();
  return (
    <DashboardShell session={session} nav={AUTHORITY_NAV} area="authority">
      {children}
    </DashboardShell>
  );
}
