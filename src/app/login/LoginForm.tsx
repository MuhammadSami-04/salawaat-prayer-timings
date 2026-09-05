"use client";

import { useActionState } from "react";

import { signIn, type ActionState } from "@/app/actions/auth";
import { FormField, Input } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(signIn, null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="redirect" value={redirectTo ?? "/dashboard"} />

      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <FormField label="Username" htmlFor="username">
        <Input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          placeholder="Zakaria Authority"
        />
      </FormField>

      <FormField label="Password" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
      </FormField>

      <SubmitButton className="w-full" size="lg" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>

      <p className="text-center text-xs text-subtle">
        Accounts are created by the Super Admin. Contact them if you need access or have forgotten your password.
      </p>
    </form>
  );
}
