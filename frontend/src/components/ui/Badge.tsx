import type { HTMLAttributes } from "react";

type BadgeVariant = "success" | "warning" | "danger" | "info" | "secondary" | "primary" | "default";

const variants: Record<BadgeVariant, string> = {
  default: "bg-surface text-muted border border-border",
  primary: "bg-primary/15 text-primary border border-primary/25",
  secondary: "bg-surface text-muted border border-border",
  success: "bg-success/15 text-success border border-success/30",
  warning: "bg-warning/15 text-warning border border-warning/30",
  danger: "bg-danger/15 text-danger border border-danger/30",
  info: "bg-info/15 text-info border border-info/30",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ variant = "secondary", className = "", children, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
