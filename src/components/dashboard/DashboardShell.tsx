import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/ui/Logo";
import { signOut } from "@/app/actions/auth";
import { roleLabel } from "@/lib/auth";
import type { SessionUser } from "@/lib/types";
import { NavLink } from "./NavLink";

export interface NavItem {
  href: string;
  label: string;
}

export const AUTHORITY_NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/timings", label: "Prayer Timings" },
  { href: "/dashboard/special-prayers", label: "Special Prayers" },
  { href: "/dashboard/announcements", label: "Announcements" },
  { href: "/dashboard/history", label: "Update History" },
  { href: "/dashboard/account", label: "My Account" },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Assignments" },
  { href: "/admin/locations", label: "Locations" },
  { href: "/admin/authorities", label: "Authorities" },
  { href: "/admin/logs", label: "Audit Logs" },
  { href: "/dashboard/account", label: "My Account" },
];

/** Shared chrome for every signed-in page: header, tab nav, sign-out. */
export function DashboardShell({
  session,
  nav,
  area,
  children,
}: {
  session: SessionUser;
  nav: NavItem[];
  area: "authority" | "admin";
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-border-soft bg-background">
        <div className="page-container flex h-16 items-center justify-between gap-3">
          <Logo
            size={32}
            compact
            subtitle={area === "admin" ? "Admin Console" : "Authority Dashboard"}
            href="/"
          />

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-foreground">
                {session.profile.full_name || session.profile.email}
              </p>
              <p className="text-xs text-muted">{roleLabel(session.profile.role)}</p>
            </div>

            {session.isSuperAdmin ? (
              <Link
                href={area === "admin" ? "/dashboard" : "/admin"}
                className="rounded-lg px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary-soft"
              >
                {area === "admin" ? "Authority view" : "Admin"}
              </Link>
            ) : null}

            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg border border-border-strong px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        <nav className="page-container">
          <ul className="-mx-3 flex gap-1 overflow-x-auto scrollbar-slim pb-px">
            {nav.map((item) => (
              <li key={item.href}>
                <NavLink href={item.href}>{item.label}</NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="page-container pb-16 pt-6 sm:pt-8">{children}</main>
    </div>
  );
}
