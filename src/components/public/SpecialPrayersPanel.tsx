import type { SpecialPrayer, SpecialPrayerType } from "@/lib/types";
import { formatTime } from "@/lib/prayer";
import { formatShortDate } from "@/lib/date";

export const SPECIAL_PRAYER_LABELS: Record<SpecialPrayerType, string> = {
  eid_fitr: "Eid-ul-Fitr",
  eid_adha: "Eid-ul-Adha",
  taraweeh: "Taraweeh",
};

/**
 * Eid and Taraweeh. Per the brief, the section disappears entirely rather
 * than showing an empty shell when nothing is configured.
 */
export function SpecialPrayersPanel({ prayers }: { prayers: SpecialPrayer[] }) {
  if (prayers.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="font-display text-lg font-semibold text-foreground">
        Special Prayers &amp; Events
      </h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {prayers.map((prayer) => (
          <li
            key={prayer.id}
            className="rounded-2xl border border-border-soft bg-surface px-4 py-4 card-shadow"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-base font-semibold text-primary">
                  {SPECIAL_PRAYER_LABELS[prayer.type]}
                </p>
                <p className="mt-0.5 text-xs text-subtle">
                  {prayer.end_date && prayer.end_date !== prayer.date
                    ? `${formatShortDate(prayer.date)} – ${formatShortDate(prayer.end_date)}`
                    : formatShortDate(prayer.date)}
                </p>
              </div>
              {prayer.prayer_time ? (
                <p className="tnum shrink-0 text-xl font-semibold text-foreground">
                  {formatTime(prayer.prayer_time)}
                </p>
              ) : null}
            </div>

            {prayer.rakah ? (
              <p className="mt-2 inline-flex rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
                {prayer.rakah}
              </p>
            ) : null}

            {prayer.announcement ? (
              <p className="mt-2 text-sm leading-relaxed text-muted">{prayer.announcement}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
