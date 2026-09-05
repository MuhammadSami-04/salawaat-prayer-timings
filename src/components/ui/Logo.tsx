import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** The Salawat mark, used as the single brand element across the app. */
export function Logo({
  size = 40,
  className,
  withWordmark = true,
  subtitle,
  href = "/",
  compact = false,
}: {
  size?: number;
  className?: string;
  withWordmark?: boolean;
  subtitle?: string;
  href?: string | null;
  /** Hides the wordmark on phones so the mark alone carries the header. */
  compact?: boolean;
}) {
  const content = (
    <span className={cn("flex items-center gap-3", className)}>
      <Image
        src="/logo.png"
        alt="Salawat"
        width={size}
        height={size}
        priority
        className="h-auto w-auto object-contain"
        style={{ width: size, height: "auto" }}
      />
      {withWordmark ? (
        <span className={cn("flex-col leading-tight", compact ? "hidden sm:flex" : "flex")}>
          <span className="font-display text-base font-semibold text-primary sm:text-lg">
            University Prayer Timings
          </span>
          {subtitle ? (
            <span className="text-xs text-muted">{subtitle}</span>
          ) : null}
        </span>
      ) : null}
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} className="rounded-lg">
      {content}
    </Link>
  );
}
