import type { LucideIcon } from "lucide-react";

export function Empty({
  title,
  body,
  icon: Icon,
}: {
  title: string;
  body: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border-strong bg-surface px-6 py-14 text-center">
      {Icon && (
        <Icon
          className="mx-auto mb-3 h-6 w-6 text-faint"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      )}
      <p className="font-medium text-heading">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-[13px] text-muted">{body}</p>
    </div>
  );
}
