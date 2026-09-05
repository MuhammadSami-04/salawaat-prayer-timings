import { cn } from "@/lib/utils";

/** Durood Sharif, shown while the app is fetching. */
const DUROOD = "صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ";

/**
 * The loading state.
 *
 * The Durood is the subject; the activity indicator is deliberately small
 * and quiet beneath it. The page's own cream ground and calligraphic
 * watermark show through — this component draws no background of its own.
 *
 * Depth comes from two stacked copies of the text: a blurred green echo
 * behind, and the crisp glyphs in front carrying a light top edge and two
 * soft shadows. The two layers drift at slightly different rates, so the
 * effect reads as gentle parallax rather than a static drop shadow.
 *
 * `variant="inline"` is for pages that render inside the dashboard shell,
 * where the header and navigation are already on screen.
 */
export function LoadingScreen({
  variant = "full",
  label = "Loading",
}: {
  variant?: "full" | "inline";
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex w-full flex-col items-center justify-center px-6 text-center",
        variant === "full" ? "min-h-[70dvh] py-16" : "py-24",
      )}
    >
      <div className="durood-enter max-w-[22ch] sm:max-w-none">
        <div className="durood-float relative" style={{ textWrap: "balance" }}>
          {/* Blurred echo, purely for depth */}
          <span
            aria-hidden="true"
            lang="ar"
            dir="rtl"
            className="durood-echo pointer-events-none absolute inset-0 select-none font-arabic text-primary blur-[7px]"
            style={{ fontSize: "clamp(1.75rem, 5.2vw, 3.15rem)", lineHeight: 1.85 }}
          >
            {DUROOD}
          </span>

          <span
            lang="ar"
            dir="rtl"
            className="durood-depth relative block font-arabic text-primary"
            style={{ fontSize: "clamp(1.75rem, 5.2vw, 3.15rem)", lineHeight: 1.85 }}
          >
            {DUROOD}
          </span>
        </div>
      </div>

      {/* Secondary, and kept that way */}
      <div className="mt-9 flex items-center gap-1.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="loading-dot h-1.5 w-1.5 rounded-full bg-primary"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </div>

      <span className="sr-only">{label}</span>
    </div>
  );
}
