"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Tab link that underlines itself when its route is active. */
export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  // Exact match for section roots so /dashboard doesn't stay lit on subpages.
  const isActive =
    pathname === href || (href !== "/dashboard" && href !== "/admin" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "-mb-px block whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors",
        isActive
          ? "border-primary text-primary"
          : "border-transparent text-muted hover:border-border-strong hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
