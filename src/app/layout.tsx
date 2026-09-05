import type { Metadata, Viewport } from "next";
import { Inter, Fraunces, Aref_Ruqaa } from "next/font/google";
import "./globals.css";
import { CalligraphyBackground } from "@/components/ui/CalligraphyBackground";

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const display = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

/**
 * Aref Ruqaa — a ruqaa calligraphic face, used for the Durood on the
 * loading screen. Its stroke contrast reads as written rather than typeset.
 */
const arabic = Aref_Ruqaa({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "University Prayer Timings",
    template: "%s · University Prayer Timings",
  },
  description:
    "Live prayer timings for every mosque and hostel across the university campus — Fajr, Zuhr, Asr, Maghrib, Isha, Jumma and special prayers.",
  icons: { icon: "/logo.png" },
};

export const viewport: Viewport = {
  themeColor: "#FAF7F1",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${body.variable} ${display.variable} ${arabic.variable}`}
    >
      <body className="min-h-dvh bg-background antialiased">
        <CalligraphyBackground />
        {children}
      </body>
    </html>
  );
}
