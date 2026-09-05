"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { LocationRow } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "all" | "mosque" | "hostel";

/**
 * Searchable location selector. Renders whatever rows exist in the
 * `locations` table — add Hostel 18 in the admin panel and it appears
 * here on the next page load with no code change.
 */
export function LocationPicker({
  locations,
  selectedId,
  basePath = "/location",
  date,
}: {
  locations: LocationRow[];
  selectedId?: string;
  basePath?: string;
  date?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const mosques = useMemo(() => locations.filter((l) => l.type === "mosque"), [locations]);
  const hostels = useMemo(() => locations.filter((l) => l.type === "hostel"), [locations]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return locations.filter((location) => {
      if (filter !== "all" && location.type !== filter) return false;
      if (!needle) return true;
      return (
        location.name.toLowerCase().includes(needle) ||
        (location.building ?? "").toLowerCase().includes(needle) ||
        (location.description ?? "").toLowerCase().includes(needle)
      );
    });
  }, [locations, query, filter]);

  const groups: { title: string; items: LocationRow[] }[] = [
    { title: "Mosques", items: matches.filter((l) => l.type === "mosque") },
    { title: "Hostels", items: matches.filter((l) => l.type === "hostel") },
  ].filter((group) => group.items.length > 0);

  function select(id: string) {
    const suffix = date ? `?date=${date}` : "";
    router.push(`${basePath}/${id}${suffix}`);
  }

  return (
    <div className="rounded-2xl border border-border-soft bg-surface card-shadow">
      <div className="space-y-3 border-b border-border-soft p-4 sm:p-5">
        <div className="relative">
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <circle cx="9" cy="9" r="6" />
            <path d="m13.5 13.5 3.5 3.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search mosque or hostel…"
            aria-label="Search mosque or hostel"
            className="h-12 w-full rounded-xl border border-border-strong bg-background pl-10 pr-3 text-base text-foreground placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex gap-2" role="tablist" aria-label="Filter locations by type">
          {(
            [
              { key: "all", label: `All (${locations.length})` },
              { key: "mosque", label: `Mosques (${mosques.length})` },
              { key: "hostel", label: `Hostels (${hostels.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={filter === tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                "flex-1 whitespace-nowrap rounded-xl px-2 py-2 text-[13px] font-medium transition-colors sm:px-3 sm:text-sm",
                filter === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-muted text-muted hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[26rem] overflow-y-auto scrollbar-slim p-2 sm:max-h-[30rem]">
        {groups.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-muted">
            No location matches “{query}”.
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.title} className="mb-2 last:mb-0">
              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-subtle">
                {group.title}
              </p>
              <ul>
                {group.items.map((location) => {
                  const isSelected = location.id === selectedId;
                  return (
                    <li key={location.id}>
                      <button
                        type="button"
                        onClick={() => select(location.id)}
                        aria-current={isSelected ? "true" : undefined}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                          isSelected
                            ? "bg-primary-soft"
                            : "hover:bg-surface-muted active:bg-surface-muted",
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold",
                            location.type === "mosque"
                              ? "bg-primary/10 text-primary"
                              : "bg-accent/15 text-accent-foreground",
                          )}
                        >
                          {location.type === "mosque" ? "☾" : "⌂"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              "block truncate text-[15px] font-medium",
                              isSelected ? "text-primary" : "text-foreground",
                            )}
                          >
                            {location.name}
                          </span>
                          {location.building ? (
                            <span className="block truncate text-xs text-subtle">
                              {location.building}
                            </span>
                          ) : null}
                        </span>
                        {isSelected ? (
                          <span className="text-xs font-semibold text-primary">Viewing</span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
