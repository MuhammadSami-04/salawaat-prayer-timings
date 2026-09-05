"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { LocationRow } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Location switcher for authorities assigned to more than one place.
 * A single-location authority never sees it.
 */
export function LocationTabs({
  locations,
  selectedId,
}: {
  locations: LocationRow[];
  selectedId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (locations.length <= 1) return null;

  function select(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("location", id);
    router.push(`${pathname}?${params.toString()}`);
  }

  // Beyond a handful of locations a dropdown beats a row of pills.
  if (locations.length > 6) {
    return (
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-foreground">Location</span>
        <select
          value={selectedId}
          onChange={(event) => select(event.target.value)}
          className="h-11 w-full max-w-sm rounded-xl border border-border-strong bg-surface px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
              {location.active ? "" : " (inactive)"}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Your locations">
      {locations.map((location) => (
        <button
          key={location.id}
          type="button"
          role="tab"
          aria-selected={location.id === selectedId}
          onClick={() => select(location.id)}
          className={cn(
            "rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors",
            location.id === selectedId
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border-strong bg-surface text-muted hover:text-foreground",
          )}
        >
          {location.name}
        </button>
      ))}
    </div>
  );
}
