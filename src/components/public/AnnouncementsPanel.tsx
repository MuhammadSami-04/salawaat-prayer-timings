import type { Announcement } from "@/lib/types";
import { timeAgo } from "@/lib/date";

/** Renders nothing at all when a location has no live announcements. */
export function AnnouncementsPanel({ announcements }: { announcements: Announcement[] }) {
  if (announcements.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="font-display text-lg font-semibold text-foreground">Announcements</h2>
      <ul className="space-y-2">
        {announcements.map((announcement) => (
          <li
            key={announcement.id}
            className="rounded-2xl border-l-4 border-l-accent border-y border-r border-border-soft bg-surface px-4 py-3.5 card-shadow"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="font-semibold text-foreground">{announcement.title}</p>
              <p className="text-xs text-subtle">{timeAgo(announcement.created_at)}</p>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-muted">{announcement.message}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
