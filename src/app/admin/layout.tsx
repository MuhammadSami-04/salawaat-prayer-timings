import { ADMIN_NAV, DashboardShell } from "@/components/dashboard/DashboardShell";
import { requireSuperAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSuperAdmin();
  return (
    <DashboardShell session={session} nav={ADMIN_NAV} area="admin">
      {children}
    </DashboardShell>
  );
}
