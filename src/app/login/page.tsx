import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/ui/Logo";
import { LoginForm } from "./LoginForm";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { Alert } from "@/components/ui/Alert";

export const metadata: Metadata = { title: "Authority Login" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect: redirectTo } = await searchParams;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size={72} withWordmark={false} href="/" />
          <h1 className="mt-4 font-display text-2xl font-semibold text-primary">
            University Prayer Timings
          </h1>
          <p className="mt-1 text-sm text-muted">
            Sign in to manage the timings for your assigned locations.
          </p>
        </div>

        <div className="rounded-2xl border border-border-soft bg-surface p-6 card-shadow-lg sm:p-8">
          {isSupabaseConfigured ? (
            <LoginForm redirectTo={redirectTo} />
          ) : (
            <Alert tone="warning" title="Supabase not configured">
              Add your project credentials to <code>.env.local</code>, then run the migrations in{" "}
              <code>supabase/migrations</code>.
            </Alert>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          Just looking for prayer times?{" "}
          <Link href="/" className="font-medium text-primary underline underline-offset-4">
            Open the public board
          </Link>
        </p>
      </div>
    </div>
  );
}
