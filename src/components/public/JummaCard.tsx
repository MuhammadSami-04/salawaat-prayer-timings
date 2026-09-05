import type { PrayerTiming } from "@/lib/types";
import { formatTime, JUMMA_FIELDS } from "@/lib/prayer";

/**
 * Jumma is deliberately separate from Zuhr — a location may run up to
 * three congregations, and only the ones that are set are shown.
 */
export function JummaCard({ timing }: { timing: PrayerTiming | null }) {
  const sessions = JUMMA_FIELDS.map((field, index) => ({
    label: `Jumma ${index + 1}`,
    time: timing?.[field] ?? null,
  })).filter((session) => session.time);

  if (sessions.length === 0) return null;

  return (
    <section className="rounded-2xl border border-accent/30 bg-accent-soft px-5 py-5 sm:px-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-accent-foreground">Jumma</h2>
        <span className="text-sm text-accent-foreground/70" lang="ar" dir="rtl">
          صلاة الجمعة
        </span>
      </div>

      <dl className="mt-3 grid gap-2 sm:grid-cols-3">
        {sessions.map((session) => (
          <div
            key={session.label}
            className="rounded-xl border border-accent/25 bg-surface/70 px-4 py-3"
          >
            <dt className="text-xs font-semibold uppercase tracking-wider text-accent-foreground/70">
              {sessions.length === 1 ? "Congregation" : session.label}
            </dt>
            <dd className="tnum mt-0.5 text-2xl font-semibold text-accent-foreground">
              {formatTime(session.time)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
