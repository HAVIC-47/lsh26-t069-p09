import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";

const VARIANTS = {
  primary:
    "bg-primary text-white border-primary hover:opacity-90 disabled:opacity-50",
  secondary:
    "bg-surface text-text border-border hover:border-primary hover:text-primary disabled:opacity-50",
  accent:
    "bg-accent text-[#3b2a05] border-accent hover:opacity-90 disabled:opacity-50",
  ghost:
    "bg-transparent text-muted border-transparent hover:bg-surface-2 hover:text-text",
} as const;

const SIZES = {
  // 44px minimum touch target on the default size
  md: "h-11 px-3.5 text-sm",
  sm: "h-8 px-2.5 text-xs",
} as const;

type Common = {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  children: ReactNode;
  className?: string;
};

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border font-medium " +
  "transition-colors duration-200 cursor-pointer whitespace-nowrap disabled:cursor-not-allowed";

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  children,
  ...rest
}: Common & ComponentProps<"button">) {
  return (
    <button
      className={`${base} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "secondary",
  size = "md",
  className = "",
  children,
  ...rest
}: Common & ComponentProps<typeof Link>) {
  return (
    <Link
      className={`${base} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {children}
    </Link>
  );
}
