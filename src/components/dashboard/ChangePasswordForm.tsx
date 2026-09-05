"use client";

import { useActionState, useEffect, useRef } from "react";

import { changePassword, type ActionState } from "@/app/actions/auth";
import { Alert } from "@/components/ui/Alert";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { FormField, Input } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function ChangePasswordForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(changePassword, null);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the fields on success by resetting the form, not by remounting it:
  // a `key` change would throw away the action state and the confirmation
  // message with it, leaving a successful change looking like nothing at all.
  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state?.success]);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Change your password</CardTitle>
          <p className="mt-0.5 text-sm text-muted">
            Replace the password you were given with one only you know.
          </p>
        </div>
      </CardHeader>

      <CardBody>
        <form ref={formRef} action={formAction} className="max-w-sm space-y-4">
          {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}
          {state?.success ? <Alert tone="success">{state.success}</Alert> : null}

          <FormField label="Current password" htmlFor="current_password">
            <Input
              id="current_password"
              name="current_password"
              type="password"
              autoComplete="current-password"
              required
            />
          </FormField>

          <FormField
            label="New password"
            htmlFor="new_password"
            hint="At least 8 characters."
          >
            <Input
              id="new_password"
              name="new_password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </FormField>

          <FormField label="Confirm new password" htmlFor="confirm_password">
            <Input
              id="confirm_password"
              name="confirm_password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </FormField>

          <SubmitButton pendingLabel="Changing…">Change password</SubmitButton>
        </form>
      </CardBody>
    </Card>
  );
}
