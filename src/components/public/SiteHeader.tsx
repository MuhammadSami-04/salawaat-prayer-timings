import Link from "next/link";

import { Logo } from "@/components/ui/Logo";
import { getSessionUser } from "@/lib/auth";

/** Public header. Shows a dashboard shortcut when an authority is signed in. */
export async function SiteHeader() {
  const session = await getSessionUser();

  return (
    <header className="sticky top-0 z-30 border-b border-border-soft bg-background">
      <div className="page-container flex h-16 items-center justify-between gap-3">
        <Logo size={34} compact />

        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/locations"
            className="rounded-lg px-3 py-2 font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            Locations
          </Link>
          {session ? (
            <Link
              href={session.isSuperAdmin ? "/admin" : "/dashboard"}
              className="rounded-lg bg-primary px-3 py-2 font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              {session.isSuperAdmin ? "Admin" : "Dashboard"}
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 font-medium text-primary transition-colors hover:bg-primary-soft"
            >
              <span className="sm:hidden">Login</span>
              <span className="hidden sm:inline">Authority login</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
