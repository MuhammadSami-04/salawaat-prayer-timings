/**
 * The site-wide calligraphic watermark.
 *
 * A single scattered-letterform artwork, supplied as an alpha mask and
 * tinted by CSS with `--calligraphy`. Storing it as a mask rather than a
 * coloured PNG keeps the file at 58KB and, more usefully, means the
 * watermark re-tints itself if the theme token ever changes.
 *
 * The artwork is isolated Arabic letterforms — shapes, not words. Its ink
 * is thinned through the middle of the frame (roughly 4.5% coverage in the
 * centre against 10–11% at the corners), so the content column stays clear
 * while the margins carry the texture.
 */

const MASK = "url(/calligraphy-mask.png)";

export function CalligraphyBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 select-none overflow-hidden"
    >
      <div
        className="h-full w-full opacity-[0.05] sm:opacity-[0.06]"
        style={{
          backgroundColor: "var(--calligraphy)",
          maskImage: MASK,
          WebkitMaskImage: MASK,
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskPosition: "center",
          maskSize: "cover",
          WebkitMaskSize: "cover",
        }}
      />
    </div>
  );
}
