"use client";

import { useEffect, useState } from "react";

/**
 * Renders the wall clock. The first paint is deliberately blank so the
 * server HTML and the client hydration cannot disagree about the time.
 */
export function LiveClock({ className }: { className?: string }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className={className} suppressHydrationWarning>
      {now
        ? now.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
          })
        : "--:--:--"}
    </span>
  );
}
