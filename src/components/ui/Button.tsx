import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm disabled:bg-primary/50",
  secondary:
    "bg-surface text-foreground border border-border-strong hover:bg-surface-muted disabled:opacity-50",
  ghost: "text-muted hover:bg-surface-muted hover:text-foreground disabled:opacity-50",
  danger: "bg-danger text-white hover:brightness-110 disabled:opacity-50",
  accent: "bg-accent text-accent-foreground hover:bg-accent-hover disabled:opacity-50",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-11 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

const BASE =
  "inline-flex items-center justify-center rounded-xl font-medium transition-colors " +
  "disabled:cursor-not-allowed select-none whitespace-nowrap";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return <button className={cn(BASE, VARIANTS[variant], SIZES[size], className)} {...props} />;
}

export interface LinkButtonProps extends React.ComponentProps<typeof Link> {
  variant?: Variant;
  size?: Size;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: LinkButtonProps) {
  return <Link className={cn(BASE, VARIANTS[variant], SIZES[size], className)} {...props} />;
}
