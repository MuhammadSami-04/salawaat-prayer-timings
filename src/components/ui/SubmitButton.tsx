"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "./Button";

/**
 * Submit button that disables itself while its parent form action is
 * in flight, so a double tap can never write twice.
 */
export function SubmitButton({
  children,
  pendingLabel = "Saving…",
  ...props
}: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
