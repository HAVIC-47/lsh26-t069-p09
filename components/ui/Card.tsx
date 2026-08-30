import type { ComponentProps, ReactNode } from "react";

/** Passes through extra attributes so callers can mark a card `data-reveal`. */
export function Card({
  children,
  className = "",
  padded = true,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
} & Omit<ComponentProps<"section">, "className" | "children">) {
  return (
    <section
      className={`rounded-2xl border border-border bg-surface ${
        padded ? "p-5" : ""
      } ${className}`}
      {...rest}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 border-b border-border px-5 py-4">
      <div className="min-w-0 flex-1">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {hint && <p className="mt-1 text-[13px] text-muted">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

/** Page title block, used at the top of every screen for a consistent rhythm. */
export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-7">
      {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
      <h1 className="text-[28px] leading-tight sm:text-[34px]">{title}</h1>
      {children && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-muted">
          {children}
        </div>
      )}
    </header>
  );
}
