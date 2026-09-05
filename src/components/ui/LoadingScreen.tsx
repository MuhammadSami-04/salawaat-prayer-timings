import { cn } from "@/lib/utils";

/** Durood Sharif, shown while the app is fetching. */
const DUROOD = "صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ";

const DUROOD_SIZE = "clamp(2.4rem, 8vw, 5.25rem)";

/**
 * The loading state.
 *
 * The Durood is the subject; the activity indicator is deliberately small
 * and quiet beneath it. The page's own cream ground and calligraphic
 * watermark show through — this component draws no background of its own.
 *
 * The phrase writes itself in from the right, the direction Arabic is
 * written, then settles into a slow breath. There is no shadow: the ruqaa
 * stroke contrast carries the weight on its own.
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
      <div className="durood-settle">
        <span
          lang="ar"
          dir="rtl"
          className="durood-write block max-w-[16ch] font-arabic text-primary sm:max-w-none"
          style={{ fontSize: DUROOD_SIZE, lineHeight: 1.7, textWrap: "balance" }}
        >
          {DUROOD}
        </span>
      </div>

      {/* Secondary, and kept that way */}
      <div className="mt-10 flex items-center gap-1.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="loading-dot h-1.5 w-1.5 rounded-full bg-primary/70"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </div>

      <span className="sr-only">{label}</span>
    </div>
  );
}
